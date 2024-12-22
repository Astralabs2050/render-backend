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
exports.DesignModel = exports.creatorType = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const uuid_1 = require("uuid");
const piece_model_1 = require("./piece.model");
const media_model_1 = require("./media.model");
const user_model_1 = require("./user.model");
var creatorType;
(function (creatorType) {
    creatorType["graphicsDesigner"] = "graphicsDesigner";
    creatorType["fashionIllustrator"] = "fashionIllustrator";
    creatorType["techPackDesigner"] = "techPackDesigner";
    creatorType["manufacturer"] = "manufacturer";
})(creatorType || (exports.creatorType = creatorType = {}));
let DesignModel = (() => {
    let _classDecorators = [(0, sequelize_typescript_1.Table)({ timestamps: true, tableName: "designs" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = sequelize_typescript_1.Model;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _outfitName_decorators;
    let _outfitName_initializers = [];
    let _outfitName_extraInitializers = [];
    let _pieceNumber_decorators;
    let _pieceNumber_initializers = [];
    let _pieceNumber_extraInitializers = [];
    let _prompt_decorators;
    let _prompt_initializers = [];
    let _prompt_extraInitializers = [];
    let _publicKey_decorators;
    let _publicKey_initializers = [];
    let _publicKey_extraInitializers = [];
    let _creatorType_decorators;
    let _creatorType_initializers = [];
    let _creatorType_extraInitializers = [];
    let _images_decorators;
    let _images_initializers = [];
    let _images_extraInitializers = [];
    let _userId_decorators;
    let _userId_initializers = [];
    let _userId_extraInitializers = [];
    let _user_decorators;
    let _user_initializers = [];
    let _user_extraInitializers = [];
    let _pieces_decorators;
    let _pieces_initializers = [];
    let _pieces_extraInitializers = [];
    var DesignModel = _classThis = class extends _classSuper {
        constructor() {
            super(...arguments);
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.outfitName = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _outfitName_initializers, void 0));
            this.pieceNumber = (__runInitializers(this, _outfitName_extraInitializers), __runInitializers(this, _pieceNumber_initializers, void 0));
            this.prompt = (__runInitializers(this, _pieceNumber_extraInitializers), __runInitializers(this, _prompt_initializers, void 0));
            this.publicKey = (__runInitializers(this, _prompt_extraInitializers), __runInitializers(this, _publicKey_initializers, void 0));
            this.creatorType = (__runInitializers(this, _publicKey_extraInitializers), __runInitializers(this, _creatorType_initializers, void 0));
            this.images = (__runInitializers(this, _creatorType_extraInitializers), __runInitializers(this, _images_initializers, void 0));
            this.userId = (__runInitializers(this, _images_extraInitializers), __runInitializers(this, _userId_initializers, void 0));
            this.user = (__runInitializers(this, _userId_extraInitializers), __runInitializers(this, _user_initializers, void 0));
            this.pieces = (__runInitializers(this, _user_extraInitializers), __runInitializers(this, _pieces_initializers, void 0));
            __runInitializers(this, _pieces_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "DesignModel");
    (() => {
        var _a;
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        _id_decorators = [sequelize_typescript_1.PrimaryKey, (0, sequelize_typescript_1.Default)(uuid_1.v4), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _outfitName_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)];
        _pieceNumber_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER)];
        _prompt_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.TEXT)];
        _publicKey_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)];
        _creatorType_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.ENUM(...Object.values(creatorType)))];
        _images_decorators = [(0, sequelize_typescript_1.HasMany)(() => media_model_1.MediaModel, {
                foreignKey: "designId", // Updated foreign key
                as: "media",
            })];
        _userId_decorators = [(0, sequelize_typescript_1.AllowNull)(true), (0, sequelize_typescript_1.ForeignKey)(() => user_model_1.UsersModel), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _user_decorators = [(0, sequelize_typescript_1.BelongsTo)(() => user_model_1.UsersModel, {
                foreignKey: "userId",
                as: "user",
                onDelete: "CASCADE",
            })];
        _pieces_decorators = [(0, sequelize_typescript_1.HasMany)(() => piece_model_1.PieceModel, {
                foreignKey: "designId",
                as: "pieces",
                onDelete: "CASCADE",
            })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _outfitName_decorators, { kind: "field", name: "outfitName", static: false, private: false, access: { has: obj => "outfitName" in obj, get: obj => obj.outfitName, set: (obj, value) => { obj.outfitName = value; } }, metadata: _metadata }, _outfitName_initializers, _outfitName_extraInitializers);
        __esDecorate(null, null, _pieceNumber_decorators, { kind: "field", name: "pieceNumber", static: false, private: false, access: { has: obj => "pieceNumber" in obj, get: obj => obj.pieceNumber, set: (obj, value) => { obj.pieceNumber = value; } }, metadata: _metadata }, _pieceNumber_initializers, _pieceNumber_extraInitializers);
        __esDecorate(null, null, _prompt_decorators, { kind: "field", name: "prompt", static: false, private: false, access: { has: obj => "prompt" in obj, get: obj => obj.prompt, set: (obj, value) => { obj.prompt = value; } }, metadata: _metadata }, _prompt_initializers, _prompt_extraInitializers);
        __esDecorate(null, null, _publicKey_decorators, { kind: "field", name: "publicKey", static: false, private: false, access: { has: obj => "publicKey" in obj, get: obj => obj.publicKey, set: (obj, value) => { obj.publicKey = value; } }, metadata: _metadata }, _publicKey_initializers, _publicKey_extraInitializers);
        __esDecorate(null, null, _creatorType_decorators, { kind: "field", name: "creatorType", static: false, private: false, access: { has: obj => "creatorType" in obj, get: obj => obj.creatorType, set: (obj, value) => { obj.creatorType = value; } }, metadata: _metadata }, _creatorType_initializers, _creatorType_extraInitializers);
        __esDecorate(null, null, _images_decorators, { kind: "field", name: "images", static: false, private: false, access: { has: obj => "images" in obj, get: obj => obj.images, set: (obj, value) => { obj.images = value; } }, metadata: _metadata }, _images_initializers, _images_extraInitializers);
        __esDecorate(null, null, _userId_decorators, { kind: "field", name: "userId", static: false, private: false, access: { has: obj => "userId" in obj, get: obj => obj.userId, set: (obj, value) => { obj.userId = value; } }, metadata: _metadata }, _userId_initializers, _userId_extraInitializers);
        __esDecorate(null, null, _user_decorators, { kind: "field", name: "user", static: false, private: false, access: { has: obj => "user" in obj, get: obj => obj.user, set: (obj, value) => { obj.user = value; } }, metadata: _metadata }, _user_initializers, _user_extraInitializers);
        __esDecorate(null, null, _pieces_decorators, { kind: "field", name: "pieces", static: false, private: false, access: { has: obj => "pieces" in obj, get: obj => obj.pieces, set: (obj, value) => { obj.pieces = value; } }, metadata: _metadata }, _pieces_initializers, _pieces_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        DesignModel = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return DesignModel = _classThis;
})();
exports.DesignModel = DesignModel;
