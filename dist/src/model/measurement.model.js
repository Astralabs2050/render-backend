"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeasurementModel = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const user_model_1 = require("./user.model");
const uuid_1 = require("uuid");
let MeasurementModel = (() => {
    let _classDecorators = [(0, sequelize_typescript_1.Table)({ timestamps: true, tableName: "measurement" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = sequelize_typescript_1.Model;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _userId_decorators;
    let _userId_initializers = [];
    let _userId_extraInitializers = [];
    let _user_decorators;
    let _user_initializers = [];
    let _user_extraInitializers = [];
    let _region_decorators;
    let _region_initializers = [];
    let _region_extraInitializers = [];
    let _pieceType_decorators;
    let _pieceType_initializers = [];
    let _pieceType_extraInitializers = [];
    let _collarSize_decorators;
    let _collarSize_initializers = [];
    let _collarSize_extraInitializers = [];
    let _sleeveLength_decorators;
    let _sleeveLength_initializers = [];
    let _sleeveLength_extraInitializers = [];
    let _chestSize_decorators;
    let _chestSize_initializers = [];
    let _chestSize_extraInitializers = [];
    let _waistSizeShirt_decorators;
    let _waistSizeShirt_initializers = [];
    let _waistSizeShirt_extraInitializers = [];
    let _shirtLength_decorators;
    let _shirtLength_initializers = [];
    let _shirtLength_extraInitializers = [];
    let _waistSize_decorators;
    let _waistSize_initializers = [];
    let _waistSize_extraInitializers = [];
    let _inseamLength_decorators;
    let _inseamLength_initializers = [];
    let _inseamLength_extraInitializers = [];
    let _hipSize_decorators;
    let _hipSize_initializers = [];
    let _hipSize_extraInitializers = [];
    let _thighSize_decorators;
    let _thighSize_initializers = [];
    let _thighSize_extraInitializers = [];
    let _trouserLength_decorators;
    let _trouserLength_initializers = [];
    let _trouserLength_extraInitializers = [];
    var MeasurementModel = _classThis = class extends _classSuper {
        // Validation logic for ensuring measurements based on pieceType
        static validateMeasurement(model) {
            // Ensure all required fields are filled based on pieceType
            if (model.pieceType === "shirt") {
                if (model.collarSize === undefined ||
                    model.sleeveLength === undefined ||
                    model.chestSize === undefined ||
                    model.waistSizeShirt === undefined ||
                    model.shirtLength === undefined) {
                    throw new Error("All shirt measurements (collarSize, sleeveLength, chestSize, waistSizeShirt, shirtLength) are required.");
                }
            }
            else if (model.pieceType === "trouser") {
                if (model.waistSize === undefined ||
                    model.inseamLength === undefined ||
                    model.hipSize === undefined ||
                    model.thighSize === undefined ||
                    model.trouserLength === undefined) {
                    throw new Error("All trouser measurements (waistSize, inseamLength, hipSize, thighSize, trouserLength) are required.");
                }
            }
            else {
                throw new Error("Invalid pieceType. Only 'shirt' or 'trouser' are allowed.");
            }
        }
        constructor() {
            super(...arguments);
            this.id = __runInitializers(this, _id_initializers, (0, uuid_1.v4)());
            this.userId = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _userId_initializers, void 0));
            this.user = (__runInitializers(this, _userId_extraInitializers), __runInitializers(this, _user_initializers, void 0));
            this.region = (__runInitializers(this, _user_extraInitializers), __runInitializers(this, _region_initializers, void 0));
            this.pieceType = (__runInitializers(this, _region_extraInitializers), __runInitializers(this, _pieceType_initializers, void 0));
            // Shirt measurements
            this.collarSize = (__runInitializers(this, _pieceType_extraInitializers), __runInitializers(this, _collarSize_initializers, void 0)); // Collar size for shirts
            this.sleeveLength = (__runInitializers(this, _collarSize_extraInitializers), __runInitializers(this, _sleeveLength_initializers, void 0)); // Sleeve length for shirts
            this.chestSize = (__runInitializers(this, _sleeveLength_extraInitializers), __runInitializers(this, _chestSize_initializers, void 0)); // Chest size for shirts
            this.waistSizeShirt = (__runInitializers(this, _chestSize_extraInitializers), __runInitializers(this, _waistSizeShirt_initializers, void 0)); // Waist size for shirts
            this.shirtLength = (__runInitializers(this, _waistSizeShirt_extraInitializers), __runInitializers(this, _shirtLength_initializers, void 0)); // Shirt length
            // Trouser measurements
            this.waistSize = (__runInitializers(this, _shirtLength_extraInitializers), __runInitializers(this, _waistSize_initializers, void 0)); // Waist size for trousers
            this.inseamLength = (__runInitializers(this, _waistSize_extraInitializers), __runInitializers(this, _inseamLength_initializers, void 0)); // Inseam length for trousers
            this.hipSize = (__runInitializers(this, _inseamLength_extraInitializers), __runInitializers(this, _hipSize_initializers, void 0)); // Hip size for trousers
            this.thighSize = (__runInitializers(this, _hipSize_extraInitializers), __runInitializers(this, _thighSize_initializers, void 0)); // Thigh size for trousers
            this.trouserLength = (__runInitializers(this, _thighSize_extraInitializers), __runInitializers(this, _trouserLength_initializers, void 0)); // Trouser length
            __runInitializers(this, _trouserLength_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "MeasurementModel");
    (() => {
        var _a;
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        _id_decorators = [(0, sequelize_typescript_1.Default)(uuid_1.v4), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _userId_decorators = [(0, sequelize_typescript_1.ForeignKey)(() => user_model_1.UsersModel), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _user_decorators = [(0, sequelize_typescript_1.BelongsTo)(() => user_model_1.UsersModel, {
                foreignKey: "userId",
                as: "user",
                onDelete: "CASCADE", // Ensure cascade delete
            })];
        _region_decorators = [(0, sequelize_typescript_1.AllowNull)(false), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)];
        _pieceType_decorators = [(0, sequelize_typescript_1.AllowNull)(false), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)];
        _collarSize_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER)];
        _sleeveLength_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER)];
        _chestSize_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER)];
        _waistSizeShirt_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER)];
        _shirtLength_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER)];
        _waistSize_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER)];
        _inseamLength_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER)];
        _hipSize_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER)];
        _thighSize_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER)];
        _trouserLength_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER)];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _userId_decorators, { kind: "field", name: "userId", static: false, private: false, access: { has: obj => "userId" in obj, get: obj => obj.userId, set: (obj, value) => { obj.userId = value; } }, metadata: _metadata }, _userId_initializers, _userId_extraInitializers);
        __esDecorate(null, null, _user_decorators, { kind: "field", name: "user", static: false, private: false, access: { has: obj => "user" in obj, get: obj => obj.user, set: (obj, value) => { obj.user = value; } }, metadata: _metadata }, _user_initializers, _user_extraInitializers);
        __esDecorate(null, null, _region_decorators, { kind: "field", name: "region", static: false, private: false, access: { has: obj => "region" in obj, get: obj => obj.region, set: (obj, value) => { obj.region = value; } }, metadata: _metadata }, _region_initializers, _region_extraInitializers);
        __esDecorate(null, null, _pieceType_decorators, { kind: "field", name: "pieceType", static: false, private: false, access: { has: obj => "pieceType" in obj, get: obj => obj.pieceType, set: (obj, value) => { obj.pieceType = value; } }, metadata: _metadata }, _pieceType_initializers, _pieceType_extraInitializers);
        __esDecorate(null, null, _collarSize_decorators, { kind: "field", name: "collarSize", static: false, private: false, access: { has: obj => "collarSize" in obj, get: obj => obj.collarSize, set: (obj, value) => { obj.collarSize = value; } }, metadata: _metadata }, _collarSize_initializers, _collarSize_extraInitializers);
        __esDecorate(null, null, _sleeveLength_decorators, { kind: "field", name: "sleeveLength", static: false, private: false, access: { has: obj => "sleeveLength" in obj, get: obj => obj.sleeveLength, set: (obj, value) => { obj.sleeveLength = value; } }, metadata: _metadata }, _sleeveLength_initializers, _sleeveLength_extraInitializers);
        __esDecorate(null, null, _chestSize_decorators, { kind: "field", name: "chestSize", static: false, private: false, access: { has: obj => "chestSize" in obj, get: obj => obj.chestSize, set: (obj, value) => { obj.chestSize = value; } }, metadata: _metadata }, _chestSize_initializers, _chestSize_extraInitializers);
        __esDecorate(null, null, _waistSizeShirt_decorators, { kind: "field", name: "waistSizeShirt", static: false, private: false, access: { has: obj => "waistSizeShirt" in obj, get: obj => obj.waistSizeShirt, set: (obj, value) => { obj.waistSizeShirt = value; } }, metadata: _metadata }, _waistSizeShirt_initializers, _waistSizeShirt_extraInitializers);
        __esDecorate(null, null, _shirtLength_decorators, { kind: "field", name: "shirtLength", static: false, private: false, access: { has: obj => "shirtLength" in obj, get: obj => obj.shirtLength, set: (obj, value) => { obj.shirtLength = value; } }, metadata: _metadata }, _shirtLength_initializers, _shirtLength_extraInitializers);
        __esDecorate(null, null, _waistSize_decorators, { kind: "field", name: "waistSize", static: false, private: false, access: { has: obj => "waistSize" in obj, get: obj => obj.waistSize, set: (obj, value) => { obj.waistSize = value; } }, metadata: _metadata }, _waistSize_initializers, _waistSize_extraInitializers);
        __esDecorate(null, null, _inseamLength_decorators, { kind: "field", name: "inseamLength", static: false, private: false, access: { has: obj => "inseamLength" in obj, get: obj => obj.inseamLength, set: (obj, value) => { obj.inseamLength = value; } }, metadata: _metadata }, _inseamLength_initializers, _inseamLength_extraInitializers);
        __esDecorate(null, null, _hipSize_decorators, { kind: "field", name: "hipSize", static: false, private: false, access: { has: obj => "hipSize" in obj, get: obj => obj.hipSize, set: (obj, value) => { obj.hipSize = value; } }, metadata: _metadata }, _hipSize_initializers, _hipSize_extraInitializers);
        __esDecorate(null, null, _thighSize_decorators, { kind: "field", name: "thighSize", static: false, private: false, access: { has: obj => "thighSize" in obj, get: obj => obj.thighSize, set: (obj, value) => { obj.thighSize = value; } }, metadata: _metadata }, _thighSize_initializers, _thighSize_extraInitializers);
        __esDecorate(null, null, _trouserLength_decorators, { kind: "field", name: "trouserLength", static: false, private: false, access: { has: obj => "trouserLength" in obj, get: obj => obj.trouserLength, set: (obj, value) => { obj.trouserLength = value; } }, metadata: _metadata }, _trouserLength_initializers, _trouserLength_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        MeasurementModel = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return MeasurementModel = _classThis;
})();
exports.MeasurementModel = MeasurementModel;
