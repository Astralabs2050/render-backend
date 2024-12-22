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
exports.PieceModel = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const uuid_1 = require("uuid");
const design_model_1 = require("./design.model");
const media_model_1 = require("./media.model");
var creatorType;
(function (creatorType) {
    creatorType["digital"] = "digital";
    creatorType["physical"] = "physical";
})(creatorType || (creatorType = {}));
let PieceModel = (() => {
    let _classDecorators = [(0, sequelize_typescript_1.Table)({ timestamps: true, tableName: "pieces" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = sequelize_typescript_1.Model;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _designId_decorators;
    let _designId_initializers = [];
    let _designId_extraInitializers = [];
    let _design_decorators;
    let _design_initializers = [];
    let _design_extraInitializers = [];
    let _pieceType_decorators;
    let _pieceType_initializers = [];
    let _pieceType_extraInitializers = [];
    let _designNumber_decorators;
    let _designNumber_initializers = [];
    let _designNumber_extraInitializers = [];
    let _piecePrice_decorators;
    let _piecePrice_initializers = [];
    let _piecePrice_extraInitializers = [];
    let _modelingPrice_decorators;
    let _modelingPrice_initializers = [];
    let _modelingPrice_extraInitializers = [];
    let _images_decorators;
    let _images_initializers = [];
    let _images_extraInitializers = [];
    var PieceModel = _classThis = class extends _classSuper {
        constructor() {
            super(...arguments);
            this.id = __runInitializers(this, _id_initializers, (0, uuid_1.v4)());
            this.designId = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _designId_initializers, void 0));
            this.design = (__runInitializers(this, _designId_extraInitializers), __runInitializers(this, _design_initializers, void 0));
            this.pieceType = (__runInitializers(this, _design_extraInitializers), __runInitializers(this, _pieceType_initializers, void 0));
            this.designNumber = (__runInitializers(this, _pieceType_extraInitializers), __runInitializers(this, _designNumber_initializers, void 0));
            this.piecePrice = (__runInitializers(this, _designNumber_extraInitializers), __runInitializers(this, _piecePrice_initializers, void 0));
            this.modelingPrice = (__runInitializers(this, _piecePrice_extraInitializers), __runInitializers(this, _modelingPrice_initializers, void 0));
            this.images = (__runInitializers(this, _modelingPrice_extraInitializers), __runInitializers(this, _images_initializers, void 0)); // This will hold multiple media items
            __runInitializers(this, _images_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "PieceModel");
    (() => {
        var _a;
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        _id_decorators = [(0, sequelize_typescript_1.Default)(uuid_1.v4), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _designId_decorators = [(0, sequelize_typescript_1.ForeignKey)(() => design_model_1.DesignModel), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _design_decorators = [(0, sequelize_typescript_1.BelongsTo)(() => design_model_1.DesignModel, {
                foreignKey: "designId",
                as: "design",
                onDelete: "CASCADE",
            })];
        _pieceType_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)];
        _designNumber_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER)];
        _piecePrice_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.FLOAT)];
        _modelingPrice_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.FLOAT)];
        _images_decorators = [(0, sequelize_typescript_1.HasMany)(() => media_model_1.MediaModel, {
                foreignKey: "pieceId", // This will link to the project
                as: "media", // More intuitive naming for multiple media items
            })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _designId_decorators, { kind: "field", name: "designId", static: false, private: false, access: { has: obj => "designId" in obj, get: obj => obj.designId, set: (obj, value) => { obj.designId = value; } }, metadata: _metadata }, _designId_initializers, _designId_extraInitializers);
        __esDecorate(null, null, _design_decorators, { kind: "field", name: "design", static: false, private: false, access: { has: obj => "design" in obj, get: obj => obj.design, set: (obj, value) => { obj.design = value; } }, metadata: _metadata }, _design_initializers, _design_extraInitializers);
        __esDecorate(null, null, _pieceType_decorators, { kind: "field", name: "pieceType", static: false, private: false, access: { has: obj => "pieceType" in obj, get: obj => obj.pieceType, set: (obj, value) => { obj.pieceType = value; } }, metadata: _metadata }, _pieceType_initializers, _pieceType_extraInitializers);
        __esDecorate(null, null, _designNumber_decorators, { kind: "field", name: "designNumber", static: false, private: false, access: { has: obj => "designNumber" in obj, get: obj => obj.designNumber, set: (obj, value) => { obj.designNumber = value; } }, metadata: _metadata }, _designNumber_initializers, _designNumber_extraInitializers);
        __esDecorate(null, null, _piecePrice_decorators, { kind: "field", name: "piecePrice", static: false, private: false, access: { has: obj => "piecePrice" in obj, get: obj => obj.piecePrice, set: (obj, value) => { obj.piecePrice = value; } }, metadata: _metadata }, _piecePrice_initializers, _piecePrice_extraInitializers);
        __esDecorate(null, null, _modelingPrice_decorators, { kind: "field", name: "modelingPrice", static: false, private: false, access: { has: obj => "modelingPrice" in obj, get: obj => obj.modelingPrice, set: (obj, value) => { obj.modelingPrice = value; } }, metadata: _metadata }, _modelingPrice_initializers, _modelingPrice_extraInitializers);
        __esDecorate(null, null, _images_decorators, { kind: "field", name: "images", static: false, private: false, access: { has: obj => "images" in obj, get: obj => obj.images, set: (obj, value) => { obj.images = value; } }, metadata: _metadata }, _images_initializers, _images_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PieceModel = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PieceModel = _classThis;
})();
exports.PieceModel = PieceModel;
