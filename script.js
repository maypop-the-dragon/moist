class Fluid {
	static fallback = null;
	static list = [];

	/**
	 * @desc Converts a fluid amount to either milliliters or ounces.
	 * @param {boolean} toOZ Whether to convert to ounces.
	 * @param {boolean} fromOZ Whether the original amount is in ounces.
	 * @param {number} amount The original amount.
	 * @returns {number} The converted amount.
	 */
	static convertAmount(toOZ, fromOZ, amount) {
		if (fromOZ && !toOZ)
			return amount * 29.5735295625;
		if (!fromOZ && toOZ)
			return amount * 0.033814022701843;
		return amount;
	}

	/**
	 * @desc Represents a fluid amount as text.
	 * @param {boolean} toOZ Whether to show the amount in ounces.
	 * @param {boolean} fromOZ Whether the amount is actually in ounces.
	 * @param {number} amount The amount to represent.
	 * @returns {string} The string representation.
	 */
	static representAmount(toOZ, fromOZ, amount) {
		let converted = Fluid.convertAmount(toOZ, fromOZ, amount);

		if (toOZ) {
			converted = Math.round(converted * 10) / 10;
			return `${converted}${".0".repeat(!(converted % 1))} oz`;
		}

		return String(Math.round(converted)) + " mL";
	}

	/**
	 * @desc A type of fluid.
	 * @param {string} name The name of the fluid.
	 * @param {number} hydration A number multiplied by the amount of fluid
	 * consumed to determine how much water it counts as.
	 * @param {string} color The fluid's color on the visualization.
	 */
	constructor(name, hydration, color) {
		// Set the fluid's properties.
		this.name = name;
		this.hydrationFactor = hydration;
		this.color = color;

		// Freeze it and add it to the list.
		Object.freeze(this);
	}
};

Fluid.fallback = new Fluid("unknown", 0.0, "#666");

class Entry {
	/**
	 * @desc Decodes an entry from a 3-character string.
	 * See the comment for Entry.prototype.encode() for info about the string.
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
	 * @param {number} fluid The fluid's index in Fluid.list.
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

		// I froze the object to prevent the user from messing it up.
		Object.freeze(this);
	}
};

// #region Fluids

Fluid.list.push(
	new Fluid("water", 1.00, "#9CF"),
	new Fluid("juice", 0.85, "#C03"),
	new Fluid("soda", 0.9, "#421")
	// TODO: tea and coffee, also account for caffiene
);

// #endregion
