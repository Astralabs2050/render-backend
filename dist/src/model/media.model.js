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
exports.MediaModel = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const uuid_1 = require("uuid");
const user_model_1 = require("./user.model");
const project_model_1 = require("./project.model");
const piece_model_1 = require("./piece.model");
const design_model_1 = require("./design.model");
let MediaModel = (() => {
    let _classDecorators = [(0, sequelize_typescript_1.Table)({ timestamps: true, tableName: "media" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = sequelize_typescript_1.Model;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _link_decorators;
    let _link_initializers = [];
    let _link_extraInitializers = [];
    let _mediaType_decorators;
    let _mediaType_initializers = [];
    let _mediaType_extraInitializers = [];
    let _userId_decorators;
    let _userId_initializers = [];
    let _userId_extraInitializers = [];
    let _user_decorators;
    let _user_initializers = [];
    let _user_extraInitializers = [];
    let _designId_decorators;
    let _designId_initializers = [];
    let _designId_extraInitializers = [];
    let _design_decorators;
    let _design_initializers = [];
    let _design_extraInitializers = [];
    let _projectId_decorators;
    let _projectId_initializers = [];
    let _projectId_extraInitializers = [];
    let _project_decorators;
    let _project_initializers = [];
    let _project_extraInitializers = [];
    let _pieceId_decorators;
    let _pieceId_initializers = [];
    let _pieceId_extraInitializers = [];
    let _piece_decorators;
    let _piece_initializers = [];
    let _piece_extraInitializers = [];
    var MediaModel = _classThis = class extends _classSuper {
        constructor() {
            super(...arguments);
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.link = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _link_initializers, void 0));
            this.mediaType = (__runInitializers(this, _link_extraInitializers), __runInitializers(this, _mediaType_initializers, void 0));
            this.userId = (__runInitializers(this, _mediaType_extraInitializers), __runInitializers(this, _userId_initializers, void 0));
            this.user = (__runInitializers(this, _userId_extraInitializers), __runInitializers(this, _user_initializers, void 0));
            this.designId = (__runInitializers(this, _user_extraInitializers), __runInitializers(this, _designId_initializers, void 0)); // Updated to designId
            this.design = (__runInitializers(this, _designId_extraInitializers), __runInitializers(this, _design_initializers, void 0));
            this.projectId = (__runInitializers(this, _design_extraInitializers), __runInitializers(this, _projectId_initializers, void 0));
            this.project = (__runInitializers(this, _projectId_extraInitializers), __runInitializers(this, _project_initializers, void 0));
            this.pieceId = (__runInitializers(this, _project_extraInitializers), __runInitializers(this, _pieceId_initializers, void 0));
            this.piece = (__runInitializers(this, _pieceId_extraInitializers), __runInitializers(this, _piece_initializers, void 0));
            __runInitializers(this, _piece_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "MediaModel");
    (() => {
        var _a;
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        _id_decorators = [sequelize_typescript_1.PrimaryKey, (0, sequelize_typescript_1.Default)(uuid_1.v4), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _link_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.TEXT)];
        _mediaType_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)];
        _userId_decorators = [(0, sequelize_typescript_1.AllowNull)(true), (0, sequelize_typescript_1.ForeignKey)(() => user_model_1.UsersModel), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _user_decorators = [(0, sequelize_typescript_1.BelongsTo)(() => user_model_1.UsersModel, {
                foreignKey: "userId",
                as: "user",
                onDelete: "CASCADE",
            })];
        _designId_decorators = [(0, sequelize_typescript_1.AllowNull)(true), (0, sequelize_typescript_1.ForeignKey)(() => design_model_1.DesignModel), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _design_decorators = [(0, sequelize_typescript_1.BelongsTo)(() => design_model_1.DesignModel, {
                foreignKey: "designId", // Updated foreign key
                as: "design",
                onDelete: "CASCADE",
            })];
        _projectId_decorators = [(0, sequelize_typescript_1.AllowNull)(true), (0, sequelize_typescript_1.ForeignKey)(() => project_model_1.ProjectModel), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _project_decorators = [(0, sequelize_typescript_1.BelongsTo)(() => project_model_1.ProjectModel, {
                foreignKey: "projectId",
                as: "project",
                onDelete: "CASCADE",
            })];
        _pieceId_decorators = [(0, sequelize_typescript_1.AllowNull)(true), (0, sequelize_typescript_1.ForeignKey)(() => piece_model_1.PieceModel), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _piece_decorators = [(0, sequelize_typescript_1.BelongsTo)(() => piece_model_1.PieceModel, {
                foreignKey: "pieceId",
                as: "piece",
                onDelete: "CASCADE",
            })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _link_decorators, { kind: "field", name: "link", static: false, private: false, access: { has: obj => "link" in obj, get: obj => obj.link, set: (obj, value) => { obj.link = value; } }, metadata: _metadata }, _link_initializers, _link_extraInitializers);
        __esDecorate(null, null, _mediaType_decorators, { kind: "field", name: "mediaType", static: false, private: false, access: { has: obj => "mediaType" in obj, get: obj => obj.mediaType, set: (obj, value) => { obj.mediaType = value; } }, metadata: _metadata }, _mediaType_initializers, _mediaType_extraInitializers);
        __esDecorate(null, null, _userId_decorators, { kind: "field", name: "userId", static: false, private: false, access: { has: obj => "userId" in obj, get: obj => obj.userId, set: (obj, value) => { obj.userId = value; } }, metadata: _metadata }, _userId_initializers, _userId_extraInitializers);
        __esDecorate(null, null, _user_decorators, { kind: "field", name: "user", static: false, private: false, access: { has: obj => "user" in obj, get: obj => obj.user, set: (obj, value) => { obj.user = value; } }, metadata: _metadata }, _user_initializers, _user_extraInitializers);
        __esDecorate(null, null, _designId_decorators, { kind: "field", name: "designId", static: false, private: false, access: { has: obj => "designId" in obj, get: obj => obj.designId, set: (obj, value) => { obj.designId = value; } }, metadata: _metadata }, _designId_initializers, _designId_extraInitializers);
        __esDecorate(null, null, _design_decorators, { kind: "field", name: "design", static: false, private: false, access: { has: obj => "design" in obj, get: obj => obj.design, set: (obj, value) => { obj.design = value; } }, metadata: _metadata }, _design_initializers, _design_extraInitializers);
        __esDecorate(null, null, _projectId_decorators, { kind: "field", name: "projectId", static: false, private: false, access: { has: obj => "projectId" in obj, get: obj => obj.projectId, set: (obj, value) => { obj.projectId = value; } }, metadata: _metadata }, _projectId_initializers, _projectId_extraInitializers);
        __esDecorate(null, null, _project_decorators, { kind: "field", name: "project", static: false, private: false, access: { has: obj => "project" in obj, get: obj => obj.project, set: (obj, value) => { obj.project = value; } }, metadata: _metadata }, _project_initializers, _project_extraInitializers);
        __esDecorate(null, null, _pieceId_decorators, { kind: "field", name: "pieceId", static: false, private: false, access: { has: obj => "pieceId" in obj, get: obj => obj.pieceId, set: (obj, value) => { obj.pieceId = value; } }, metadata: _metadata }, _pieceId_initializers, _pieceId_extraInitializers);
        __esDecorate(null, null, _piece_decorators, { kind: "field", name: "piece", static: false, private: false, access: { has: obj => "piece" in obj, get: obj => obj.piece, set: (obj, value) => { obj.piece = value; } }, metadata: _metadata }, _piece_initializers, _piece_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        MediaModel = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return MediaModel = _classThis;
})();
exports.MediaModel = MediaModel;
