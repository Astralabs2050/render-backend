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
exports.WorkExperienceModel = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const creator_model_1 = require("./creator.model"); // Adjust the path as necessary
const uuid_1 = require("uuid");
let WorkExperienceModel = (() => {
    let _classDecorators = [(0, sequelize_typescript_1.Table)({ timestamps: true, tableName: "work_experiences" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = sequelize_typescript_1.Model;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _creatorId_decorators;
    let _creatorId_initializers = [];
    let _creatorId_extraInitializers = [];
    let _creator_decorators;
    let _creator_initializers = [];
    let _creator_extraInitializers = [];
    let _title_decorators;
    let _title_initializers = [];
    let _title_extraInitializers = [];
    let _description_decorators;
    let _description_initializers = [];
    let _description_extraInitializers = [];
    let _companyName_decorators;
    let _companyName_initializers = [];
    let _companyName_extraInitializers = [];
    let _startYear_decorators;
    let _startYear_initializers = [];
    let _startYear_extraInitializers = [];
    let _startMonth_decorators;
    let _startMonth_initializers = [];
    let _startMonth_extraInitializers = [];
    let _endYear_decorators;
    let _endYear_initializers = [];
    let _endYear_extraInitializers = [];
    let _endMonth_decorators;
    let _endMonth_initializers = [];
    let _endMonth_extraInitializers = [];
    var WorkExperienceModel = _classThis = class extends _classSuper {
        constructor() {
            super(...arguments);
            this.id = __runInitializers(this, _id_initializers, (0, uuid_1.v4)());
            this.creatorId = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _creatorId_initializers, void 0));
            this.creator = (__runInitializers(this, _creatorId_extraInitializers), __runInitializers(this, _creator_initializers, void 0));
            this.title = (__runInitializers(this, _creator_extraInitializers), __runInitializers(this, _title_initializers, void 0));
            this.description = (__runInitializers(this, _title_extraInitializers), __runInitializers(this, _description_initializers, void 0));
            this.companyName = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _companyName_initializers, void 0));
            this.startYear = (__runInitializers(this, _companyName_extraInitializers), __runInitializers(this, _startYear_initializers, void 0));
            this.startMonth = (__runInitializers(this, _startYear_extraInitializers), __runInitializers(this, _startMonth_initializers, void 0));
            this.endYear = (__runInitializers(this, _startMonth_extraInitializers), __runInitializers(this, _endYear_initializers, void 0));
            this.endMonth = (__runInitializers(this, _endYear_extraInitializers), __runInitializers(this, _endMonth_initializers, void 0));
            __runInitializers(this, _endMonth_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "WorkExperienceModel");
    (() => {
        var _a;
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        _id_decorators = [(0, sequelize_typescript_1.Default)(uuid_1.v4), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _creatorId_decorators = [(0, sequelize_typescript_1.ForeignKey)(() => creator_model_1.CreatorModel), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _creator_decorators = [(0, sequelize_typescript_1.BelongsTo)(() => creator_model_1.CreatorModel, {
                foreignKey: "creatorId",
                as: "creator",
                onDelete: "CASCADE",
            })];
        _title_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)];
        _description_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)];
        _companyName_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)];
        _startYear_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE)];
        _startMonth_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE)];
        _endYear_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE)];
        _endMonth_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE)];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _creatorId_decorators, { kind: "field", name: "creatorId", static: false, private: false, access: { has: obj => "creatorId" in obj, get: obj => obj.creatorId, set: (obj, value) => { obj.creatorId = value; } }, metadata: _metadata }, _creatorId_initializers, _creatorId_extraInitializers);
        __esDecorate(null, null, _creator_decorators, { kind: "field", name: "creator", static: false, private: false, access: { has: obj => "creator" in obj, get: obj => obj.creator, set: (obj, value) => { obj.creator = value; } }, metadata: _metadata }, _creator_initializers, _creator_extraInitializers);
        __esDecorate(null, null, _title_decorators, { kind: "field", name: "title", static: false, private: false, access: { has: obj => "title" in obj, get: obj => obj.title, set: (obj, value) => { obj.title = value; } }, metadata: _metadata }, _title_initializers, _title_extraInitializers);
        __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: obj => "description" in obj, get: obj => obj.description, set: (obj, value) => { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
        __esDecorate(null, null, _companyName_decorators, { kind: "field", name: "companyName", static: false, private: false, access: { has: obj => "companyName" in obj, get: obj => obj.companyName, set: (obj, value) => { obj.companyName = value; } }, metadata: _metadata }, _companyName_initializers, _companyName_extraInitializers);
        __esDecorate(null, null, _startYear_decorators, { kind: "field", name: "startYear", static: false, private: false, access: { has: obj => "startYear" in obj, get: obj => obj.startYear, set: (obj, value) => { obj.startYear = value; } }, metadata: _metadata }, _startYear_initializers, _startYear_extraInitializers);
        __esDecorate(null, null, _startMonth_decorators, { kind: "field", name: "startMonth", static: false, private: false, access: { has: obj => "startMonth" in obj, get: obj => obj.startMonth, set: (obj, value) => { obj.startMonth = value; } }, metadata: _metadata }, _startMonth_initializers, _startMonth_extraInitializers);
        __esDecorate(null, null, _endYear_decorators, { kind: "field", name: "endYear", static: false, private: false, access: { has: obj => "endYear" in obj, get: obj => obj.endYear, set: (obj, value) => { obj.endYear = value; } }, metadata: _metadata }, _endYear_initializers, _endYear_extraInitializers);
        __esDecorate(null, null, _endMonth_decorators, { kind: "field", name: "endMonth", static: false, private: false, access: { has: obj => "endMonth" in obj, get: obj => obj.endMonth, set: (obj, value) => { obj.endMonth = value; } }, metadata: _metadata }, _endMonth_initializers, _endMonth_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        WorkExperienceModel = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return WorkExperienceModel = _classThis;
})();
exports.WorkExperienceModel = WorkExperienceModel;
