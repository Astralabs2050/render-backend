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
exports.MessageModel = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const uuid_1 = require("uuid");
const user_model_1 = require("./user.model");
let MessageModel = (() => {
    let _classDecorators = [(0, sequelize_typescript_1.Table)({ timestamps: true, tableName: "messages" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = sequelize_typescript_1.Model;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _message_decorators;
    let _message_initializers = [];
    let _message_extraInitializers = [];
    let _type_decorators;
    let _type_initializers = [];
    let _type_extraInitializers = [];
    let _content_decorators;
    let _content_initializers = [];
    let _content_extraInitializers = [];
    let _receiverId_decorators;
    let _receiverId_initializers = [];
    let _receiverId_extraInitializers = [];
    let _sent_decorators;
    let _sent_initializers = [];
    let _sent_extraInitializers = [];
    let _seen_decorators;
    let _seen_initializers = [];
    let _seen_extraInitializers = [];
    let _readAt_decorators;
    let _readAt_initializers = [];
    let _readAt_extraInitializers = [];
    let _delivered_decorators;
    let _delivered_initializers = [];
    let _delivered_extraInitializers = [];
    let _senderName_decorators;
    let _senderName_initializers = [];
    let _senderName_extraInitializers = [];
    let _receiver_decorators;
    let _receiver_initializers = [];
    let _receiver_extraInitializers = [];
    let _senderId_decorators;
    let _senderId_initializers = [];
    let _senderId_extraInitializers = [];
    let _sender_decorators;
    let _sender_initializers = [];
    let _sender_extraInitializers = [];
    var MessageModel = _classThis = class extends _classSuper {
        constructor() {
            super(...arguments);
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.message = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _message_initializers, void 0));
            this.type = (__runInitializers(this, _message_extraInitializers), __runInitializers(this, _type_initializers, void 0)); // Updated to specify message types
            this.content = (__runInitializers(this, _type_extraInitializers), __runInitializers(this, _content_initializers, void 0)); // Generalized content field for both text and image URLs
            this.receiverId = (__runInitializers(this, _content_extraInitializers), __runInitializers(this, _receiverId_initializers, void 0));
            this.sent = (__runInitializers(this, _receiverId_extraInitializers), __runInitializers(this, _sent_initializers, void 0));
            this.seen = (__runInitializers(this, _sent_extraInitializers), __runInitializers(this, _seen_initializers, void 0));
            this.readAt = (__runInitializers(this, _seen_extraInitializers), __runInitializers(this, _readAt_initializers, void 0)); // Added to track when message is read
            this.delivered = (__runInitializers(this, _readAt_extraInitializers), __runInitializers(this, _delivered_initializers, void 0));
            this.senderName = (__runInitializers(this, _delivered_extraInitializers), __runInitializers(this, _senderName_initializers, void 0)); // Added to include sender's name
            this.receiver = (__runInitializers(this, _senderName_extraInitializers), __runInitializers(this, _receiver_initializers, void 0));
            this.senderId = (__runInitializers(this, _receiver_extraInitializers), __runInitializers(this, _senderId_initializers, void 0));
            this.sender = (__runInitializers(this, _senderId_extraInitializers), __runInitializers(this, _sender_initializers, void 0));
            __runInitializers(this, _sender_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "MessageModel");
    (() => {
        var _a;
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        _id_decorators = [sequelize_typescript_1.PrimaryKey, (0, sequelize_typescript_1.Default)(uuid_1.v4), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _message_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.TEXT)];
        _type_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)];
        _content_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.TEXT)];
        _receiverId_decorators = [(0, sequelize_typescript_1.ForeignKey)(() => user_model_1.UsersModel), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _sent_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN)];
        _seen_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN)];
        _readAt_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE)];
        _delivered_decorators = [(0, sequelize_typescript_1.Default)(false), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.BOOLEAN)];
        _senderName_decorators = [(0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING)];
        _receiver_decorators = [(0, sequelize_typescript_1.BelongsTo)(() => user_model_1.UsersModel, {
                foreignKey: "receiverId",
                as: "receiver",
                onDelete: "CASCADE",
            })];
        _senderId_decorators = [(0, sequelize_typescript_1.ForeignKey)(() => user_model_1.UsersModel), (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID)];
        _sender_decorators = [(0, sequelize_typescript_1.BelongsTo)(() => user_model_1.UsersModel, {
                foreignKey: "senderId",
                as: "sender",
                onDelete: "CASCADE",
            })];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _message_decorators, { kind: "field", name: "message", static: false, private: false, access: { has: obj => "message" in obj, get: obj => obj.message, set: (obj, value) => { obj.message = value; } }, metadata: _metadata }, _message_initializers, _message_extraInitializers);
        __esDecorate(null, null, _type_decorators, { kind: "field", name: "type", static: false, private: false, access: { has: obj => "type" in obj, get: obj => obj.type, set: (obj, value) => { obj.type = value; } }, metadata: _metadata }, _type_initializers, _type_extraInitializers);
        __esDecorate(null, null, _content_decorators, { kind: "field", name: "content", static: false, private: false, access: { has: obj => "content" in obj, get: obj => obj.content, set: (obj, value) => { obj.content = value; } }, metadata: _metadata }, _content_initializers, _content_extraInitializers);
        __esDecorate(null, null, _receiverId_decorators, { kind: "field", name: "receiverId", static: false, private: false, access: { has: obj => "receiverId" in obj, get: obj => obj.receiverId, set: (obj, value) => { obj.receiverId = value; } }, metadata: _metadata }, _receiverId_initializers, _receiverId_extraInitializers);
        __esDecorate(null, null, _sent_decorators, { kind: "field", name: "sent", static: false, private: false, access: { has: obj => "sent" in obj, get: obj => obj.sent, set: (obj, value) => { obj.sent = value; } }, metadata: _metadata }, _sent_initializers, _sent_extraInitializers);
        __esDecorate(null, null, _seen_decorators, { kind: "field", name: "seen", static: false, private: false, access: { has: obj => "seen" in obj, get: obj => obj.seen, set: (obj, value) => { obj.seen = value; } }, metadata: _metadata }, _seen_initializers, _seen_extraInitializers);
        __esDecorate(null, null, _readAt_decorators, { kind: "field", name: "readAt", static: false, private: false, access: { has: obj => "readAt" in obj, get: obj => obj.readAt, set: (obj, value) => { obj.readAt = value; } }, metadata: _metadata }, _readAt_initializers, _readAt_extraInitializers);
        __esDecorate(null, null, _delivered_decorators, { kind: "field", name: "delivered", static: false, private: false, access: { has: obj => "delivered" in obj, get: obj => obj.delivered, set: (obj, value) => { obj.delivered = value; } }, metadata: _metadata }, _delivered_initializers, _delivered_extraInitializers);
        __esDecorate(null, null, _senderName_decorators, { kind: "field", name: "senderName", static: false, private: false, access: { has: obj => "senderName" in obj, get: obj => obj.senderName, set: (obj, value) => { obj.senderName = value; } }, metadata: _metadata }, _senderName_initializers, _senderName_extraInitializers);
        __esDecorate(null, null, _receiver_decorators, { kind: "field", name: "receiver", static: false, private: false, access: { has: obj => "receiver" in obj, get: obj => obj.receiver, set: (obj, value) => { obj.receiver = value; } }, metadata: _metadata }, _receiver_initializers, _receiver_extraInitializers);
        __esDecorate(null, null, _senderId_decorators, { kind: "field", name: "senderId", static: false, private: false, access: { has: obj => "senderId" in obj, get: obj => obj.senderId, set: (obj, value) => { obj.senderId = value; } }, metadata: _metadata }, _senderId_initializers, _senderId_extraInitializers);
        __esDecorate(null, null, _sender_decorators, { kind: "field", name: "sender", static: false, private: false, access: { has: obj => "sender" in obj, get: obj => obj.sender, set: (obj, value) => { obj.sender = value; } }, metadata: _metadata }, _sender_initializers, _sender_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        MessageModel = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return MessageModel = _classThis;
})();
exports.MessageModel = MessageModel;
