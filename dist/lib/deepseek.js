"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculate = void 0;
const calculate = async ({ title, id }) => {
    // Simulation d'un calcul (remplacer par logique réelle si dispo)
    const hash = [...title].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const score = (hash + id.length * 10) % 100;
    return score;
};
exports.calculate = calculate;
// EOF
