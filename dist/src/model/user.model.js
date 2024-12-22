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
exports.UsersModel = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const uuid_1 = require("uuid");
const creator_model_1 = require("./creator.model");
const brand_model_1 = require("./brand.model");
var userType;
(function (userType) {
    userType["brand"] = "brand";
    userType["creator"] = "creator";
})(userType || (userType = {}));
const media_model_1 = require("./media.model"); // Adjust the import path as needed
let UsersModel = (() => {
    let _classDecorators = [(0, sequelize_typescript_1.Table)({ timestamps: true, tableName: "users" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = sequelize_typescript_1.Model;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _creator_decorators;
    let _creator_initializers = [];
    let _creator_extraInitializers = [];
    let _brand_decorators;
    let _brand_initializers = [];
    let _brand_extraInitializers = [];
    let _media_decorators;
    let _media_initializers = [];
    let _media_extraInitializers = [];
    let _email_decorators;
    let _email_initializers = [];
    let _email_extraInitializers = [];
    let _password_decorators;
    let _password_initializers = [];
    let _password_extraInitializers = [];
    let _language_decorators;
    let _language_initializers = [];
    let _language_extraInitializers = [];
    let _verified_decorators;
    let _verified_initializers = [];
    let _verified_extraInitializers = [];
    let _active_decorators;
    let _active_initializers = [];
    let _active_extraInitializers = [];
    let _lastseen_decorators;
    let _lastseen_initializers = [];
    let _lastseen_extraInitializers = [];
    let _otp_decorators;
    let _otp_initializers = [];
    let _otp_extraInitializers = [];
    let _isOtpVerified_decorators;
    let _isOtpVerified_initializers = [];
    let _isOtpVerified_extraInitializers = [];
    let _otpCreatedAt_decorators;
    let _otpCreatedAt_initializers = [];
    let _otpCreatedAt_extraInitializers = [];
    let _isOtpExp_decorators;
    let _isOtpExp_initializers = [];
    let _isOtpExp_extraInitializers = [];
    let _isAdmin_decorators;
    let _isAdmin_initializers = [];
    let _isAdmin_extraInitializers = [];
    let _userType_decorators;
    let _userType_initializers = [];
    let _userType_extraInitializers = [];
    var UsersModel = _classThis = class extends _classSuper {
        toJSON() {
            const values = Object.assign({}, this.get());
            delete values.password;
            return values;
        }
        // Computed method to check if OTP is expired
        isOtpExpired() {
            if (!this.otpCreatedAt) {
                return true; // Consider it expired if there's no timestamp
            }
            const expirationTime = new Date(this.otpCreatedAt.getTime() + 30 * 60 * 1000); // 30 minutes in milliseconds
            return new Date() > expirationTime;
        }
        constructor() {
            super(...arguments);
            this.id = __runInitializers(this, _id_initializers, (0, uuid_1.v4)());
            this.creator = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _creator_initializers, void 0));
            this.brand = (__runInitializers(this, _creator_extraInitializers), __runInitializers(this, _brand_initializers, void 0));
            // Add the HasMany association for MediaModel
            this.media = (__runInitializers(this, _brand_extraInitializers), __runInitializers(this, _media_initializers, void 0));
            this.email = (__runInitializers(this, _media_extraInitializers), __runInitializers(this, _email_initializers, void 0));
            this.password = (__runInitializers(this, _email_extraInitializers), __runInitializers(this, _password_initializers, void 0));
            this.language = (__runInitializers(this, _password_extraInitializers), __runInitializers(this, _language_initializers, void 0));
            this.verified = (__runInitializers(this, _language_extraInitializers), __runInitializers(this, _verified_initializers, void 0));
            this.active = (__runInitializers(this, _verified_extraInitializers), __runInitializers(this, _active_initializers, void 0));
            this.lastseen = (__runInitializers(this, _active_extraInitializers), __runInitializers(this, _lastseen_initializers, void 0));
            this.otp = (__runInitializers(this, _lastseen_extraInitializers), __runInitializers(this, _otp_initializers, void 0));
            this.isOtpVerified = (__runInitializers(this, _otp_extraInitializers), __runInitializers(this, _isOtpVerified_initializers, void 0));
            this.otpCreatedAt = (__runInitializers(this, _isOtpVerified_extraInitializers), __runInitializers(this, _otpCreatedAt_initializers, void 0)); // Track when the OTP was generated
            this.isOtpExp = (__runInitializers(this, _otpCreatedAt_extraInitializers), __runInitializers(this, _isOtpExp_initializers, void 0));
            this.isAdmin = (__runInitializers(this, _isOtpExp_extraInitializers), __runInitializers(this, _isAdmin_initializers, void 0));
            this.userType = (__runInitializers(this, _isAdmin_extraInitializers), __runInitializers(this, _userType_initializers, void 0));
            __runInitializers(this, _userType_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "UsersModel");
    (() => {
        var _a;
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        _id_decorators = [(0, sequelize_typescript_1.Default)(uuid_1.v4), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _creator_decorators = [(0, sequelize_typescript_1.HasOne)(() => creator_model_1.CreatorModel, {
                foreignKey: "userId", // Reference to the user's id
                as: "creator", // Alias for the association
            })];
        _brand_decorators = [(0, sequelize_typescript_1.HasOne)(() => brand_model_1.BrandModel, {
                foreignKey: "userId", // Reference to the user's id
                as: "brand", // Alias for the association
            })];
        _media_decorators = [(0, sequelize_typescript_1.HasMany)(() => media_model_1.MediaModel, {
                foreignKey: "userId", // Reference to the user's id in the MediaModel
                as: "media", // Alias for the media association
            })];
        _email_decorators = [(0, sequelize_typescript_1.Index)({ name: "combined-key-index1", unique: true }), (0, sequelize_typescript_1.AllowNull)(false), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)];
        _password_decorators = [(0, sequelize_typescript_1.AllowNull)(false), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)];
        _language_decorators = [(0, sequelize_typescript_1.AllowNull)(true), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)];
        _verified_decorators = [(0, sequelize_typescript_1.Default)(false), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN)];
        _active_decorators = [(0, sequelize_typescript_1.Default)(false), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN)];
        _lastseen_decorators = [(0, sequelize_typescript_1.AllowNull)(true), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE)];
        _otp_decorators = [(0, sequelize_typescript_1.AllowNull)(true), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)];
        _isOtpVerified_decorators = [(0, sequelize_typescript_1.Default)(false), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN)];
        _otpCreatedAt_decorators = [(0, sequelize_typescript_1.Default)(Date.now), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE)];
        _isOtpExp_decorators = [(0, sequelize_typescript_1.Default)(false), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN)];
        _isAdmin_decorators = [(0, sequelize_typescript_1.Default)(false), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN)];
        _userType_decorators = [(0, sequelize_typescript_1.AllowNull)(true), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.ENUM(...Object.values(userType)))];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _creator_decorators, { kind: "field", name: "creator", static: false, private: false, access: { has: obj => "creator" in obj, get: obj => obj.creator, set: (obj, value) => { obj.creator = value; } }, metadata: _metadata }, _creator_initializers, _creator_extraInitializers);
        __esDecorate(null, null, _brand_decorators, { kind: "field", name: "brand", static: false, private: false, access: { has: obj => "brand" in obj, get: obj => obj.brand, set: (obj, value) => { obj.brand = value; } }, metadata: _metadata }, _brand_initializers, _brand_extraInitializers);
        __esDecorate(null, null, _media_decorators, { kind: "field", name: "media", static: false, private: false, access: { has: obj => "media" in obj, get: obj => obj.media, set: (obj, value) => { obj.media = value; } }, metadata: _metadata }, _media_initializers, _media_extraInitializers);
        __esDecorate(null, null, _email_decorators, { kind: "field", name: "email", static: false, private: false, access: { has: obj => "email" in obj, get: obj => obj.email, set: (obj, value) => { obj.email = value; } }, metadata: _metadata }, _email_initializers, _email_extraInitializers);
        __esDecorate(null, null, _password_decorators, { kind: "field", name: "password", static: false, private: false, access: { has: obj => "password" in obj, get: obj => obj.password, set: (obj, value) => { obj.password = value; } }, metadata: _metadata }, _password_initializers, _password_extraInitializers);
        __esDecorate(null, null, _language_decorators, { kind: "field", name: "language", static: false, private: false, access: { has: obj => "language" in obj, get: obj => obj.language, set: (obj, value) => { obj.language = value; } }, metadata: _metadata }, _language_initializers, _language_extraInitializers);
        __esDecorate(null, null, _verified_decorators, { kind: "field", name: "verified", static: false, private: false, access: { has: obj => "verified" in obj, get: obj => obj.verified, set: (obj, value) => { obj.verified = value; } }, metadata: _metadata }, _verified_initializers, _verified_extraInitializers);
        __esDecorate(null, null, _active_decorators, { kind: "field", name: "active", static: false, private: false, access: { has: obj => "active" in obj, get: obj => obj.active, set: (obj, value) => { obj.active = value; } }, metadata: _metadata }, _active_initializers, _active_extraInitializers);
        __esDecorate(null, null, _lastseen_decorators, { kind: "field", name: "lastseen", static: false, private: false, access: { has: obj => "lastseen" in obj, get: obj => obj.lastseen, set: (obj, value) => { obj.lastseen = value; } }, metadata: _metadata }, _lastseen_initializers, _lastseen_extraInitializers);
        __esDecorate(null, null, _otp_decorators, { kind: "field", name: "otp", static: false, private: false, access: { has: obj => "otp" in obj, get: obj => obj.otp, set: (obj, value) => { obj.otp = value; } }, metadata: _metadata }, _otp_initializers, _otp_extraInitializers);
        __esDecorate(null, null, _isOtpVerified_decorators, { kind: "field", name: "isOtpVerified", static: false, private: false, access: { has: obj => "isOtpVerified" in obj, get: obj => obj.isOtpVerified, set: (obj, value) => { obj.isOtpVerified = value; } }, metadata: _metadata }, _isOtpVerified_initializers, _isOtpVerified_extraInitializers);
        __esDecorate(null, null, _otpCreatedAt_decorators, { kind: "field", name: "otpCreatedAt", static: false, private: false, access: { has: obj => "otpCreatedAt" in obj, get: obj => obj.otpCreatedAt, set: (obj, value) => { obj.otpCreatedAt = value; } }, metadata: _metadata }, _otpCreatedAt_initializers, _otpCreatedAt_extraInitializers);
        __esDecorate(null, null, _isOtpExp_decorators, { kind: "field", name: "isOtpExp", static: false, private: false, access: { has: obj => "isOtpExp" in obj, get: obj => obj.isOtpExp, set: (obj, value) => { obj.isOtpExp = value; } }, metadata: _metadata }, _isOtpExp_initializers, _isOtpExp_extraInitializers);
        __esDecorate(null, null, _isAdmin_decorators, { kind: "field", name: "isAdmin", static: false, private: false, access: { has: obj => "isAdmin" in obj, get: obj => obj.isAdmin, set: (obj, value) => { obj.isAdmin = value; } }, metadata: _metadata }, _isAdmin_initializers, _isAdmin_extraInitializers);
        __esDecorate(null, null, _userType_decorators, { kind: "field", name: "userType", static: false, private: false, access: { has: obj => "userType" in obj, get: obj => obj.userType, set: (obj, value) => { obj.userType = value; } }, metadata: _metadata }, _userType_initializers, _userType_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        UsersModel = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return UsersModel = _classThis;
})();
exports.UsersModel = UsersModel;
