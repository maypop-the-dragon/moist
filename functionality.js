'use strict';

//#region Elements

/**
 * @desc short for "get element", because I don't want to write `document.getElementById`
 * @type {function(string): Element}
 * */
const gel = document.getElementById.bind(document);

const paneCalendar = gel("pane-calendar");
const tableCalendar = gel("table-calendar");
const buttonCalendarBack = gel("button-calendar-back");
const buttonCalendarNext = gel("button-calendar-next");
const buttonCalendarNow = gel("button-calendar-now");
const textCalendarMonth = gel("text-calendar-month");

const paneEntry = gel("pane-entry");
const inputEntryAmount = gel("input-entry-amount");
const inputEntryFluid = gel("input-entry-fluid");
const textEntryUnit = gel("text-entry-unit");
const buttonEntryAdd = gel("button-entry-add");
const buttonEntryCancel = gel("button-entry-cancel");

const paneLog = gel("pane-log");
const buttonLogAdd = gel("button-log-add");

const panePrefs = gel("pane-prefs");
const buttonPrefsOpen = gel("button-log-prefs");

//#endregion Elements
//#region Utilities and Variables

/** @desc the currently active ui pane @type {Element | null} */
let activePane = null;
/** @desc activates (shows) a certain ui pane @param {Element} pane the pane to activate */
function activatePane(pane) {
	if (activePane !== null) {
		activePane.classList.remove("active");
		if (activePane.classList.contains("subpane")) {
			let ancestor = activePane.parentElement;

			while (ancestor !== null) {
				if (ancestor.classList.contains("pane")) {
					ancestor.classList.remove("active");
					break;
				}

				ancestor = ancestor.parentElement;
			}
		}
	}

	pane.classList.add("active");
	if (pane.classList.contains("subpane")) {
		let ancestor = pane.parentElement;

		while (ancestor !== null) {
			if (ancestor.classList.contains("pane")) {
				ancestor.classList.add("active");
				break;
			}

			ancestor = ancestor.parentElement;
		}
	}

	activePane = pane;
}

/** @desc an object that stores user preferences */
const prefs = {
	/** @desc whether the user prefers ounces over milliliters */
	"useOZ": navigator.language.endsWith("-US"),
	"useMeridiem": true,

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

		this.useMeridiem = Boolean(data.charCodeAt(0) & 2);
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
		return String.fromCharCode(
			((this.useMeridiem & 1) << 2)
			| (this.useOZ & 1)
		);
	},

	/**
	 * @desc apply the options that cause immediate changes
	 *
	 * this function does not work unless the element variables are initialized
	 * @returns {this} (chainable)
	 */
	apply() {
		if (this.useOZ) {
			inputEntryAmount.step = 0.1;
			textEntryUnit.innerText = "oz";
		} else {
			inputEntryAmount.step = 1;
			textEntryUnit.innerText = "mL";
		}
		// TODO: render log, since it has units and times in it as well.

		return this;
	}
};

//#endregion
//#region Calendar Pane

function calendarClickEvent(event) {
	console.log(`Unfortunately, I haven't done that yet.
Key: ${this.moistKey}, Data; ${this.moistData}`);
}

function populateCalendar() {
	if (calendarBody !== null)
		calendarBody.remove();
	calendarBody = tableCalendar.appendChild(activeMonth.generateCalendarPage(calendarClickEvent));
	textCalendarMonth.innerText = activeMonth.toString();
}

let activeMonth = new Month(new Date().getFullYear(), new Date().getMonth() + 1);
let calendarBody = null;
populateCalendar();

buttonCalendarBack.addEventListener("click", function(event) {
	activeMonth = activeMonth.previous();
	populateCalendar();
});
buttonCalendarNext.addEventListener("click", function(event) {
	if (activeMonth.month === new Date().getMonth() + 1 && activeMonth.year === new Date().getFullYear())
		return;

	activeMonth = activeMonth.next();
	populateCalendar();
});
buttonCalendarNow.addEventListener("click", function(event) {
	activeMonth = new Month(new Date().getFullYear(), new Date().getMonth() + 1);
	populateCalendar();
});

//#endregion
//#region Log Pane

buttonLogAdd.addEventListener("click", () => {
	activatePane(paneEntry);
	inputEntryAmount.focus();
});
buttonPrefsOpen.addEventListener("click", () => {
	activatePane(panePrefs);
	this.blur();
});

//#endregion
//#region Entry Pane

// Populate the fluid dropdown
for (let i = 0; i < Fluid.shown.length; ++i) {
	const option = document.createElement("OPTION");
	option.innerText = Fluid.shown[i].name;
	option.value = i;

	inputEntryFluid.appendChild(option);
}

/**
 * @desc checks whether the entry amount is valid. if it is not, it focuses that
 * input and disables the add entry button
 * @returns {boolean} whether that value is valid
 */
function checkEntryAmount() {
	const amount = Number(inputEntryAmount.value);

	buttonEntryAdd.disabled = true;
	if (amount > 0 && amount < 6000.1 && Math.floor(amount * 10) / 10 === amount)
		buttonEntryAdd.disabled = false;
	else
		inputEntryAmount.focus();

	return !buttonEntryAdd.disabled;
}
inputEntryAmount.addEventListener("input", checkEntryAmount);
buttonEntryAdd.addEventListener("click", () => {
	if (!checkEntryAmount())
		return;

	const amount = Number(inputEntryAmount.value);
	const fluid = Fluid.shown[inputEntryFluid.value];

	inputEntryAmount.value = "0";
	inputEntryFluid.value = "0";

	console.error("TODO: make entry work uwu");
	activatePane(paneLog);
});
buttonEntryCancel.addEventListener("click", () => {
	inputEntryAmount.value = "0";
	inputEntryFluid.value = "0";

	activatePane(paneLog);
});

//#endregion

// Decode the user's preferences and apply them.
prefs.decode(localStorage.getItem("moist:prefs")).apply();

activatePane(paneLog);
