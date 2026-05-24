export var GameState;
(function (GameState) {
    GameState["Playing"] = "Playing";
    GameState["Paused"] = "Paused";
})(GameState || (GameState = {}));
export var AbilityType;
(function (AbilityType) {
    AbilityType["None"] = "None";
    AbilityType["Fire"] = "Fire";
    AbilityType["Electric"] = "Electric";
    AbilityType["Ice"] = "Ice";
})(AbilityType || (AbilityType = {}));
export var DamageType;
(function (DamageType) {
    DamageType["Physical"] = "Physical";
    DamageType["Fire"] = "Fire";
    DamageType["Explosion"] = "Explosion";
    DamageType["Electric"] = "Electric";
})(DamageType || (DamageType = {}));
