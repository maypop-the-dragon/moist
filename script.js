/**
 * @desc Converts a fluid amount to either milliliters or ounces.
 * @param {boolean} toOZ Whether to convert to ounces.
 * @param {boolean} fromOZ Whether the original amount is in ounces.
 * @param {number} amount The original amount.
 * @returns {number} The converted amount.
 */
function convertAmount(toOZ, fromOZ, amount) {
	if (fromOZ && !toOZ)
		return amount * 29.5735295625;
	if (!fromOZ && toOZ)
		return amount * 0.033814022701843;
	return amount;
}

/**
 * @desc Represents a fluid amount as text.
 * @param {boolean} toOZ Whether to show the amount in ounces.
 * @param {boolean} fromOZ Whether the amount is already in ounces.
 * @param {number} amount The amount to represent.
 * @returns {string} The string representation.
 */
function representAmount(toOZ, fromOZ, amount) {
	let converted = Fluid.convertAmount(toOZ, fromOZ, amount);

	if (toOZ) {
		converted = Math.round(converted * 10) / 10;
		return `${converted}${".0".repeat(!(converted % 1))} oz`;
	}

	return String(Math.round(converted)) + " mL";
}


/**
 * @desc Represents a time of day as textual.
 * @param {number} hour The hour of the day.
 * @param {number} minute The minute of the day.
 * @param {boolean} useMeridiem Whether to use 12-hour time with am and pm.
 * @returns {string} The textual representation.
 */
function representTime(useMeridiem) {
	return `${
		useMeridiem ? hour % 12 || 12 : hour
	}:${
		"0".repeat(minute < 10) + String(minute)
	}${
		useMeridiem ? (hour < 12 ? "am" : "pm") : ""
	}`;
}

class Fluid {
	static #secret = Symbol();
	static list = [];

	/** @desc displayed name */
	name = "";
	/** @desc displayed color */
	color = "#999999";
	/** @desc water concentration */
	water = 1.0;
	/** @desc selectable? */
	visible = true;

	/** @desc encoded representation */
	data = "\uE499\u9999";

	/** @desc identifier */
	index = -1;

	/**
	 * @desc Decode a fluid from a string.
	 * @param {string} data The string to decode.
	 * @returns {Fluid} The decoded fluid.
	 */
	static decode(data) {
		data = String(data);

		const first = data.charCodeAt(0);

		const visible = Boolean(first >> 15);
		const water = Math.max(0, Math.min(100, first >> 8 & 0b01111111)) / 100;

		const second = data.charCodeAt(1);

		let color = "#";
		color += "0".repeat(first & 255 < 0x10) + (first & 255).toString(16);
		color += second.toString(16).padStart(4, "0");

		const name = data.substring(2, 22);

		return new Fluid(name, color, water, visible, Fluid.#secret, data);
	}

	/**
	 * @desc Permanently saves the fluid to the fluid list.
	 * @returns {number} Its new index in the fluid list.
	 */
	save() {
		if (this.index !== -1)
			return this.index;

		const listData = localStorage.getItem("moist:fluids") ?? "";
		let pos = 0, index = 0;
		while (pos < listData.length) {
			const data = listData.substring(pos, listData.indexOf("\u0000", pos + 2));

			if (data === this.data)
				return index;

			pos += data.length + 1;
			++index;
		}

		localStorage.setItem("moist:fluids", listData + this.data + "\u0000");

		this.index = Fluid.list.length;
		Fluid.list.push(this);
		console.log("added", this);

		return this.index;
	}

	/**
	 * @desc A fluid that the user may drink.
	 * @param {string} name The fluid's name.
	 * @param {string} color The fluid's color as a 6-digit hex code (including the # symbol).
	 * @param {number} water Portion of water in this fluid with two decimal places of precision.
	 * @param {boolean} visible Whether the fluid is selectable for new entries.
	 * @param _ Internal argument used to skip normalization and pre-encoding.
	 * @param $ Internal argument used to provided pre-pre-encoded data.
	 */
	constructor(name = "???", color = "#999999", water = 1.0, visible = true, _, $) {
		if (_ === Fluid.#secret)
			this.data = $;
		else {
			// The name cannot contain nulls.
			name = String(name).replaceAll("\u0000", "\uFFFF");

			// The color must be a lowercase 6-digit hex code.
			color = String(color);
			if (!/^#[0-9A-Fa-f]{6}$/.test(color))
				color = "#999999";
			else
				color = color.toLowerCase();

			// The water concentration's gotta be, like, a percent, man.
			const waterPercent = Math.round(Math.max(100, Math.min(0, (Number(water) || 0) * 100)));
			water = waterPercent / 100;

			// Simple enough. It's a boolean.
			visible = Boolean(visible);

			// Pre-encode all this data.
			this.data = String.fromCharCode(
				visible << 15 |
				waterPercent << 8 |
				parseInt(color.substring(1, 3), 16)
			) + String.fromCharCode(parseInt(color.substring(3,7), 16)) + name;
		}

		this.name = name;
		this.color = color;
		this.water = water;
		this.visible = visible;
	}
};

// Load all the fluids that were in local storage.
{
	const listData = localStorage.getItem("moist:fluids") ?? "";
	let pos = 0;
	while (pos < listData.length) {
		const data = listData.substring(pos, listData.indexOf("\u0000", pos + 2));

		const fluid = Fluid.decode(data);
		fluid.index = Fluid.list.length;
		Fluid.list.push(fluid);

		pos += data.length + 1;
	}
}

class Entry {
	// TODO: renderToElement

	/**
	 * @desc Decodes an entry from a 3-character string.
	 * See the comment on Entry.prototype.encode() for info about the string.
	 * @param {string} data The string to decode.
	 * @returns {Entry} The decoded entry.
	 */
	static decode(data) {
		const complicated = data.charCodeAt(0);

		return new Entry(
			data.charCodeAt(2) / 10,
			complicated >> 15,
			Fluid.list[data.charCodeAt(1)] ?? Fluid.fallback,
			complicated & 0b0000011111000000 >> 6,
			complicated & 0b0000000000111111
		);
	}

	/**
	 * @desc Encodes the entry into a 3-character string.
	 * @returns {string} The encoded data. Its 3 characters are:
	 * 1. the lowest 6 bits are the minute,
	 *    the next lowest 5 bits are the hour,
	 *    the highest bit is whether the amount is in ounces,
	 *    and the other 4 are unused
	 * 2. the consumed fluid's index in Fluid.list
	 * 3. the amount times 10
	 */
	encode() {
		this.fluid.save();
		return String.fromCharCode(this.isOZ << 15 | this.hour << 6 | this.minute)
			+ String.fromCharCode(Fluid.list.indexOf(this.fluid))
			+ String.fromCharCode(Math.round(this.amount * 10));
	}

	/**
	 * @desc Represents the entry's time as text.
	 * @param {boolean} useMeridiem Whether to use 12-hour time with AM and PM.
	 * @returns {string} The textual representation.
	 */
	representTime(useMeridiem) {
		return `${
			useMeridiem ? this.hour % 12 || 12 : this.hour
		}:${
			"0".repeat(this.minute < 10) + String(this.minute)
		}${
			useMeridiem ? (this.hour < 12 ? "am" : "pm") : ""
		}`;
	}

	/**
	 * @desc An entry in the hydration log.
	 * @param {number} amount The amount of fluid consumed.
	 * @param {boolean} isOZ Whether that amount is in ounces.
	 * @param {Fluid} fluid The fluid consumed.
	 * @param {number} hour The hour in the day the entry was registered.
	 * @param {number} minute The minute in the hour the entry was registered.
	 */
	constructor(amount, isOZ, fluid, hour, minute) {
		// I normalized the values because I'm an annoying perfectionist.
		this.amount = Math.max(0, Math.min(6553.5, Math.round(Number(amount) * 10 || 0) / 10));
		this.isOZ = Boolean(isOZ);
		this.fluid = fluid instanceof Fluid ? fluid : Fluid.fallback[0];
		this.hour = Math.max(0, Math.min(23, Math.floor(Number(hour) || 0)));
		this.minute = Math.max(0, Math.min(59, Math.floor(Number(minute) || 0)));
	}
};

class Day {
	entries = [];

	// TODO: encode, decode

	/**
	 * @desc Decodes a day from a string.
	 * See the comment on Day.prototype.encode() for info about the string.
	 * @param {string} data The encoded data.
	 * @returns {Day} The decoded day.
	 */
	static decode(data) {
		const day = new Day(
			data.charCodeAt(1) / 10,
			data.charCodeAt(0) >> 15
		);

		for (let i = 2; i < data.length; i += 3)
			day.addEntry(Entry.decode(data.substring(i, i + 3)));

		return day;
	}

	/**
	 * @desc Encodes the day and its entries into a string.
	 * @param {*} data The encoded data. It's first 2 characters are:
	 * 1. the highest bit is whether the amounts are in ounces,
	 *    and the rest are unused
	 * 2. the goal water amount times 10
	 *
	 * The rest of the string is entry data.
	 * @returns {string} The encoded data.
	 */
	encode() {
		let data = String.fromCharCode(this.isOZ << 15)
			+ String.fromCharCode(this.goal)
			+ String.fromCharCode(this.total);

		for (let i = 0; i < this.entries.length; ++i)
			data += this.entries[i].encode();

		return data;
	}

	/**
	 * @desc Adds an entry.
	 * @param {Entry} entry The entry.
	 * @returns {Entry} The entry.
	 */
	addEntry(entry) {
		this.entries.push(entry);
		this.total += entry.amount * entry.fluid.water;
		return entry;
	}

	/**
	 * @desc Adds a new entry. The time is set automatically.
	 * @param {number} amount The amount of fluid consumed.
	 * @param {boolean} isOZ Whether that amount is in ounces.
	 * @param {Fluid} fluid The fluid consumed.
	 * @returns {Entry} The new entry.
	 */
	addNewEntry(amount, isOZ, fluid) {
		const date = new Date;
		const entry = new Entry(amount, isOZ, fluid, date.getHours(), date.getMinutes());
		this.entries.push(entry);
		this.total += entry.amount * entry.fluid.water;
		return entry;
	}

	/**
	 * @desc Renders a color graph thing for this day.
	 * @param {CanvasRenderingContext2D} ctx The canvas context.
	 */
	renderToCanvas(ctx) {
		const HEIGHT = ctx.canvas.height, GOAL = Fluid.convertAmount(false, this.isOZ, this.goal);
		let y = HEIGHT;

		ctx.clearRect(1, 0, 1, HEIGHT);

		for (let i = 0; i < this.entries.length; ++i) {
			const ENTRY = this.entries[i];

			let size = Fluid.convertAmount(false, ENTRY.isOZ, ENTRY.amount * ENTRY.fluid.water) / GOAL * ctx.canvas.height;
			y -= size;

			ctx.fillStyle = ENTRY.fluid.color;
			ctx.fillRect(1, y, 1, size);
		}
	}

	/**
	 * @desc All the entries for a whole day.
	 * @param {number} goal The goal amount.
	 * @param {boolean} isOZ Whether the goal and amount consumed are in ounces.
	 */
	constructor(goal, isOZ) {
		this.isOZ = Boolean(isOZ);
		this.goal = Math.max(0, Math.min(6553.5, Math.round(Number(goal) * 10 || 0) / 10));
		this.total = 0;
	}
};
