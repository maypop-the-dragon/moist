'use strict';

class Drink {
	// These properties are explained in the constructor's comment.
	name = "rocks";
	hydrationFactor = 0;
	color = "#999";

	/**
	 * @desc Instances of this class represent drink types.
	 * They are all stored inside the DRINKS array.
	 * @param {*} name The drink's name.
	 * @param {*} hydrationFactor The fraction of the drink that is water.
	 * @param {*} color The drink's color on the bottle thingy.
	 */
	constructor(name, hydrationFactor, color) {
		this.name = name;
		this.hydrationFactor = hydrationFactor;
		this.color = color;
	}
};

const DRINKS = [
	new Drink("water", 1.00, "#9CF"),
	new Drink("juice", 0.85, "#C03"),
	new Drink("soda", 0.9, "#421")
];
