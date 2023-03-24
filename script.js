'use strict';

// #region Elements

/** @desc alias for `document.getElementById` @type {Function} */
const getEl = document.getElementById.bind(document);

const containerMain = getEl("container-main");
const paneLog = getEl("pane-log");
const paneNotifs = getEl("pane-notifs");

const paneEntry = getEl("pane-entry");
const entryInputAmount = getEl("entry-amount");
const entryInputFluid = getEl("entry-fluid");
const entryTextUnit = getEl("entry-unit");

const panePrefs = getEl("pane-prefs");
const buttonPrefs = getEl("button-prefs");
const buttonPrefsClose = getEl("button-prefs-close");

const paneCalendar = getEl("pane-calendar");
const buttonCalendar = getEl("button-calendar");

// #endregion
// #region Prolific Objects

/** @desc the class for fluids. it has some static methods */
class Fluid {
	/** @desc every saved fluid @type Fluid[] */
	static saved = Fluid.decodeCollection(localStorage.getItem("moist:fluids"));
	/** @desc every selectable fluid @type Fluid[] */
	static shown = Fluid.saved.filter(fluid => fluid.alwaysShown);

	/** @desc this fluid's name @type {string} */
	name = "???";
	/** @desc this fluid's color code @type {string} */
	color = "#999";
	/** @desc this fluid's hydration factor @type {number} */
	hydration = 0.0;
	/** @desc is this fluid permanently selectable? @type {boolean} */
	alwaysShown = false;

	/** @desc this fluid's storable representation @type {string} */
	data = "";
	/** @desc the fluid's saved index (-1 if not saved) @type {number} */
	index = -1;

	/**
	 * @desc convert a fluid amount from mL or oz to mL or oz
	 * @param {number} amount the original amount
	 * @param {boolean} fromOZ is the original amount in oz?
	 * @param {boolean} toOZ should the result be in oz?
	 * @returns {number} the converted amount
	 */
	static convertAmount(amount, fromOZ, toOZ) {
		if (fromOZ === toOZ)
			return amount;
		if (fromOZ && !toOZ)
			return amount * 29.5735295625;
		return amount / 29.5735295625;
	}

	/**
	 * @desc represent a fluid amount as text
	 * @param {number} amount the original amount
	 * @param {boolean} fromOZ is the original amount in oz?
	 * @param {boolean} toOZ should the result be in oz?
	 * @returns {string} the textual reprsentation
	 */
	static representAmount(amount, fromOZ, toOZ) {
		let converted = Fluid.convertAmount(amount, fromOZ, toOZ);

		if (toOZ) {
			let number = String(Math.round(converted * 10) / 10);
			if (!number.includes("."))
				number += ".0";

			return number + "oz";
		}

		return Math.round(converted) + "mL";
	}

	/** @desc save one or more fluids @param {Fluid[]} fluids the fluids to save */
	static save(fluids) {
		for (const fluid of fluids) {
			const twin = Fluid.saved.find(item => item.data === fluid.data);

			if (twin === undefined) {
				fluid.index = fluids.length;
				Fluid.saved.push(fluid);
			} else
				fluid.index = twin.index;
		}

		let data = "";
		for (let i = 0; i < Fluid.saved.length; ++i)
			data += Fluid.saved[i].data;
		localStorage.setItem("moist:fluids", data);
	}

	/**
	 * @desc make one or more fluids selectable and saves the "always shown" ones
	 * @param {Fluid[]} fluids the fluids to show
	 */
	static show(fluids) {
		let toSave = [];

		for (const fluid of fluids) {
			const twin = Fluid.shown.find(item => item.data === fluid.data);

			if (twin === undefined) {
				Fluid.shown.push(fluid);

				if (fluid.alwaysShown)
					toSave.push(fluid);
			} else
				fluid.index = twin.index;
		}

		Fluid.save(toSave);
	}

	/**
	 * @desc decode a fluid from a string
	 * @param {string} data the string to decode
	 *
	 * Shhhhhhh000LLLLL 0000rrrrggggbbbb <name>
	 *
	 * - 0: (unused bits)
	 * - S: alwaysShown
	 * - h: hydration
	 * - L: name.length
	 * - r, g, b: color components
	 * @returns {Fluid} the decoded fluid
	 */
	static decode(data) {
		const color = "#" + (data.charCodeAt(1) & 0x0FFF).toString(16).padStart(3, "0");

		const complicated = data.charCodeAt(0);
		const alwaysShown = complicated >> 15;
		const hydration = Math.min(100, (complicated >> 8) & 0b01111111);

		const nameLength = complicated & 0b00011111;
		const name = data.substring(2, 2 + nameLength);

		return new Fluid(name, color, hydration, alwaysShown);
	}

	/**
	 * @desc decode an array of fluids from a string
	 * @param {string | null} data the string to decode (data for several fluids concatenated)
	 * @returns {Fluid[]} the decoded fluids
	 */
	static decodeCollection(data) {
		if (data === null)
			return [];
		data = String(data);

		const list = [];
		let pos = 0, index = 0;
		while (pos < data.length) {
			const item = Fluid.decode(data.substring(pos));
			pos += item.data.length;
			list.push(item);

			item.index = index;
			++index;
		}

		return list;
	}

	/**
	 * @desc a fluid that the user may consume
	 * @param {string} name the fluid's name (up to 31 characters)
	 * @param {string} color the fluid's color as a 3-digit hex code (#XXX)
	 * @param {number} hydration the fluid's hydration factor as a percentage (0-100)
	 * @param {boolean} alwaysShown show this fluid permanently?
	 */
	constructor(name, color, hydration, alwaysShown) {
		name = String(name).substring(0, 31);

		color = String(color).toLowerCase();
		if (!/^#[0-9a-f]{3}$/.test(color)) {
			console.warn(`Color value "${color}" for ${name} is not a valid 3-digit hex code!`);
			color = "#999";
		}

		hydration = Math.max(0, Math.min(100, Math.round(Number(hydration) || 0)));

		alwaysShown = Boolean(alwaysShown);

		// This data is pre-encoded because it's accessed frequently. See Fluid.decode().
		this.data = String.fromCharCode(
			(alwaysShown << 15)
			| (hydration << 8)
			| (name.length),
			parseInt(color.substring(1, 4), 16)
		) + name;

		this.name = name;
		this.color = color;
		this.hydration = hydration / 100; // It's stored as a decimal.
		this.alwaysShown = alwaysShown;
	}
};

// Add water automatically.
Fluid.show([new Fluid("Water", "#6CF", 100, true)]);

/** @desc the class for entries. it has some static methods */
class Entry {
	/** @desc the fluid consumed @type {Fluid} */
	fluid = null;
	/** @desc is the amount in ounces? @type {boolean} */
	isOZ = false;
	/** @desc the amount of fluid consumed @type {number} */
	amount = 0;
	/** @desc the hour the entry was added @type {number} */
	hour = 0;
	/** @desc the minute the entry was added @type {number} */
	minute = 0;

	/**
	 * @desc decode an entry from a string
	 * @param {string} data the string to decode
	 *
	 * U0000HHHHHmmmmmm aaaaaaaaaaaaaaaa IIIIIIIIIIIIIIII
	 *
	 * - 0: (unused bits)
	 * - U: isOZ
	 * - H: hour
	 * - m: minute
	 * - a: amount * 10
	 * - I: fluid.index
	 * @returns {Entry} the decoded entry
	 */
	static decode(data) {
		const complicated = data.charCodeAt(0) || 0;

		const isOZ = complicated >> 15;
		const hour = (complicated >> 6) & 31;
		const minute = complicated & 63;
		const amount = data.charCodeAt(1) / 10;
		const fluid = Fluid.saved[data.charCodeAt(2)] ?? Fluid.saved[0];

		return new Entry(fluid, isOZ, amount, hour, minute);
	}

	/**
	 * @desc represent a time of day as text
	 * @param {boolean} useMeridiem use 12-hour time with am and pm?
	 * @param {number} hour the hour of the day
	 * @param {number} minute the minute of the hour
	 * @returns {string} the textual representation
	 */
	static representTime(useMeridiem, hour, minute) {
		let visualHour = hour;
		if (useMeridiem)
			visualHour = hour % 12 || 12;

		let text = String(visualHour) + ":" + String(minute).padStart(2, "0");

		if (useMeridiem)
			text += hour < 12 ? "am" : "pm";

		return text;
	}

	/**
	 * @desc encode this entry into a string. this is not done in the constructor because encoding
	 * an entry requires that its fluid is saved, and the fluid should not be saved unless an entry
	 * using it is saved. speaking of which, this function also saves the entry's fluid
	 *
	 * see Entry.decode for info on the format
	 * @returns {string} the encoded data
	 */
	encode() {
		if (this.fluid.index === -1)
			Fluid.save(this.fluid);

		return String.fromCharCode(
			(this.isOZ << 15)
			| ((this.hour & 31) << 6)
			| (this.minute & 63),
			this.amount * 10,
			this.fluid.index
		);
	}

	/**
	 * @desc generate an html element of this entry for the ui
	 * @param {boolean} toOZ use ounces?
	 * @param {number} useMeridiem use 12-hour time with am and pm?
	 * @returns {HTMLTableRowElement} the html element
	 */
	generateElement(toOZ, useMeridiem) {
		const row = document.createElement("TR");

		const time = row.appendChild(document.createElement("TD"));
		time.id = "time";
		time.innerText = Entry.representTime(useMeridiem, this.hour, this.minute);

		const amount = row.appendChild(document.createElement("TD"));
		amount.id = "amount";
		amount.innerText = Fluid.representAmount(this.amount, this.isOZ, toOZ);

		const fluid = row.appendChild(document.createElement("TD"));
		fluid.id = "fluid";
		fluid.innerText = this.fluid.name;
		fluid.style.color = this.fluid.color;

		return row;
	}

	/**
	 * @desc a log entry
	 * @param {Fluid} fluid the fluid consumed
	 * @param {boolean} isOZ is the amount in ounces?
	 * @param {number} amount the amount of fluid consumed
	 * @param {number} hour the hour the entry was added
	 * @param {number} minute the minute the entry was added
	 */
	constructor(fluid, isOZ, amount, hour, minute) {
		if (!(fluid instanceof Fluid))
			fluid = Fluid.shown[0];
		isOZ = Boolean(isOZ);
		amount = Math.max(0, Math.min(6553.5, Math.round((Number(amount) || 0) * 10) / 10));
		hour = Math.max(0, Math.min(23, Math.round(Number(hour) || 0)));
		minute = Math.max(0, Math.min(59, Math.round(Number(minute) || 0)));

		this.fluid = fluid;
		this.isOZ = isOZ;
		this.amount = amount;
		this.hour = hour;
		this.minute = minute;
	}
};

/** @desc the class for a day's log. it has some static methods */
class DailyLog {
	/** @desc the goal amount @type {number} */
	goal = 0;
	/** @desc the consumed amount @type {number} */
	total = 0;
	/** @desc are the amounts in ounces? @type {boolean} */
	isOZ = false;
	/** @desc the day's entries @type {Entry[]} */
	entries = [];

	/**
	 * @desc decodes a daily log from a string
	 * @param {string} data the string to decode
	 *
	 * U000000000000000 GGGGGGGGGGGGGGGG <entries>
	 *
	 * - 0: (unused bits)
	 * - U: isOZ
	 * - G: goal * 10
	 * @returns {DailyLog} the decoded log
	 */
	static decode(data) {
		const isOZ = data.charCodeAt(0) >> 15;
		const log = new DailyLog(isOZ, data.charCodeAt(1) / 10);

		for (let i = 2; i < data.length; i += 3) {
			const entry = Entry.decode(data.substring(i, i + 3));
			log.total += Fluid.convertAmount(entry.amount, entry.isOZ, log.isOZ) * entry.fluid.hydration;
			log.entries.push(entry);
		}

		return log;
	}

	/**
	 * @desc encodes the log into a string
	 *
	 * see DailyLog.decode for info on the format
	 * @returns {string} the encoded data
	 */
	encode() {
		let data = String.fromCharCode(this.isOZ << 15, this.goal * 10);

		for (let i = 0; i < this.entries.length; ++i)
			data += this.entries[i].encode();

		return data;
	}

	/**
	 * @desc adds an entry to the list. the time is determined automatically
	 * @param {Fluid} fluid the fluid consumed
	 * @param {boolean} isOZ is the amount in ounces?
	 * @param {number} amount the amount of fluid consumed
	 * @returns {this} chainable
	 */
	register(fluid, isOZ, amount) {
		const now = new Date;
		const entry = new Entry(fluid, isOZ, amount, now.getHours(), now.getMinutes());

		this.total += Fluid.convertAmount(entry.amount, entry.isOZ, this.isOZ) * entry.fluid.hydration;
		this.entries.push(entry);

		return this;
	}

	/**
	 * @desc a day's log
	 * @param {boolean} isOZ is the goal in ounces?
	 * @param {number} goal the goal amount
	 */
	constructor(isOZ, goal) {
		this.isOZ = Boolean(isOZ);
		this.goal = Math.max(0, Math.min(6553.5, Math.round((Number(goal) || 0) * 10) / 10));
	}
};

/** @desc an object that stores user preferences */
const prefs = {
	/** @desc whether the user prefers ounces over milliliters */
	"useOZ": navigator.language.endsWith("-US"),

	/**
	 * @desc decode a string and writes those preferences to this object
	 *
	 * 000000000000000U
	 * - 0: (unused bits)
	 * - U: useOZ
	 * @returns {this} (chainable)
	 */
	decode(data) {
		if (data === null)
			return this;

		this.useOZ = Boolean(data.charCodeAt(0) & 1);

		return this;
	},

	/**
	 * @desc decode a string and writes those preferences to this object
	 *
	 * see prefs.encode for info on the format
	 * @returns {string} the encoded data
	 */
	encode() {
		return String.fromCharCode(this.useOZ & 1);
	},

	/**
	 * @desc apply the options that cause other changes
	 * @returns {this} (chainable)
	 */
	apply() {
		if (this.useOZ) {
			entryInputAmount.step = 0.1;
			entryTextUnit.innerText = "oz";
		} else {
			entryInputAmount.step = 1;
			entryTextUnit.innerText = "mL";
		}
		// TODO: render log, since it has units in it as well

		return this;
	}
};

prefs.decode(localStorage.getItem("moist:prefs")).apply();

// #endregion

for (let i = 0; i < Fluid.shown.length; ++i) {
	const option = document.createElement("OPTION");
	option.value = i;
	option.innerText = Fluid.shown[i].name;
	entryInputFluid.appendChild(option);
}

/** @desc the currently active pane @type {Element} */
let activePane = paneLog;
/** @desc the most recently active pane that is not active anymore @type {Element} */
let previouslyActivePane = paneLog;
/**
 * @desc change the active pane
 * @param {Element} pane the pane to change to
 */
function switchPane(pane) {
	if (pane === activePane)
		return;

	if (activePane.classList.contains("subpane"))
		containerMain.classList.remove("active");

	activePane.classList.remove("active");

	if (pane.classList.contains("subpane"))
		containerMain.classList.add("active");
	pane.classList.add("active");

	previouslyActivePane = activePane;
	activePane = pane;
}

buttonPrefs.addEventListener("click", () => switchPane(panePrefs));
buttonCalendar.addEventListener("click", () => switchPane(paneCalendar));
buttonPrefsClose.addEventListener("click", () => switchPane(previouslyActivePane));
