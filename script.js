/** @desc the class for fluids. it has some static methods */
class Fluid {
	/** @desc every saved fluid @type Fluid[] */
	static saved = Fluid.decodeCollection(localStorage.getItem("moist:fluids"));
	/** @desc every selectable fluid @type Fluid[] */
	static shown = Fluid.saved.filter(fluid => fluid.alwaysShown);

	/**
	 * @desc converts a fluid amount from mL or oz to mL or oz
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
	 * @desc represents a fluid amount as text
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

			return number + " oz";
		}

		return Math.round(converted) + " mL";
	}

	/** @desc saves one or more fluids @param {...Fluid} fluids the fluids to save */
	static save(...fluids) {
		// TODO
	}

	/**
	 * @desc makes one or more fluids selectable and saves the "always shown" ones
	 * @param {...Fluid} fluids the fluids to show
	 */
	static show(...fluids) {
		// TODO
	}

	/**
	 * @desc decodes a fluid from a string
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
		const hydration = Math.min(100, complicated >> 8 & 0b01111111);

		const nameLength = complicated & 0b00011111;
		const name = data.substring(2, 2 + nameLength);

		return new Fluid(name, color, hydration, alwaysShown);
	}

	/**
	 * @desc decodes an array of fluids from a string
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
			alwaysShown << 15
			| hydration << 8
			| name.length,
			parseInt(color.substring(1, 4), 16)
		) + name;

		this.name = name;
		this.color = color;
		this.hydration = hydration / 100; // It's stored as a decimal.
		this.alwaysShown = alwaysShown;
	}
};

// Water gets added automatically.
Fluid.show(new Fluid("Water", "#66CCFF", 100, true));

/** @desc the class for entries. it has some static methods */
class Entry {
	/**
	 * @desc encodes this entry into a string. this is not done in the constructor because encoding
	 * an entry requires that its fluid is saved, and the fluid should not be saved unless an entry
	 * using it is saved
	 * @returns {string} the encoded data
	 */
	encode() {
		// TODO
	}

	/**
	 * @desc a log entry
	 * @param {Fluid} fluid the fluid consumed
	 * @param {boolean} isOZ is the amount in ounces?
	 * @param {number} amount the amount of fluid consumed
	 */
	constructor(fluid, isOZ, amount) {
		if (!(fluid instanceof Fluid))
			fluid = Fluid.shown[0];
		isOZ = Boolean(isOZ);
		amount = Math.max(0, Math.min(6553.5, Math.round(Number(amount) || 0)));

		this.fluid = fluid;
		this.isOZ = isOZ;
		this.amount = amount;
	}
};

// Just had a thought: how do I deal with the user switching time zones?
