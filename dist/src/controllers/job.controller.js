"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const job_service_1 = __importDefault(require("../service/job.service"));
class jobController {
    constructor() {
        this.createJob = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req === null || req === void 0 ? void 0 : req.user;
                const response = yield job_service_1.default.createJob(req.body, id);
                return res.json(response);
            }
            catch (error) {
                return res.status(400).json({
                    status: false,
                    message: `An error occurred: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
                });
            }
        });
        this.getJob = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req === null || req === void 0 ? void 0 : req.user;
                const { status } = req.params;
                const response = yield job_service_1.default.getJob(id, status);
                return res.json(response);
            }
            catch (error) {
                return res.status(400).json({
                    status: false,
                    message: `An error occurred: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
                });
            }
        });
        this.saveJob = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req === null || req === void 0 ? void 0 : req.user;
                const { jobId } = req === null || req === void 0 ? void 0 : req.body;
                const response = yield job_service_1.default.saveJob(id, jobId);
                return res.json(response);
            }
            catch (error) {
                return res.status(400).json({
                    status: false,
                    message: `An error occurred: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
                });
            }
        });
        this.acceptDeclineJob = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { jobApplicationId, status, negotiation = false } = req === null || req === void 0 ? void 0 : req.body;
                const response = yield job_service_1.default.acceptDeclineJobApplication(jobApplicationId, status, negotiation);
                return res.json(response);
            }
            catch (error) {
                return res.status(400).json({
                    status: false,
                    message: `An error occurred: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
                });
            }
        });
        this.getSaveJob = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req === null || req === void 0 ? void 0 : req.user;
                const response = yield job_service_1.default.getSavedJob(id);
                return res.json(response);
            }
            catch (error) {
                return res.status(400).json({
                    status: false,
                    message: `An error occurred: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
                });
            }
        });
        this.updateJob = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req === null || req === void 0 ? void 0 : req.user;
                const { jobId, status } = req === null || req === void 0 ? void 0 : req.body;
                const response = yield job_service_1.default.updateJob(jobId, status);
                return res.json(response);
            }
            catch (error) {
                return res.status(400).json({
                    status: false,
                    message: `An error occurred: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
                });
            }
        });
        this.getEachJob = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const authUser = req === null || req === void 0 ? void 0 : req.user;
                console.log("the job id", id);
                const response = yield job_service_1.default.getEachJob(id, authUser);
                return res.json(response);
            }
            catch (error) {
                return res.status(400).json({
                    status: false,
                    message: `An error occurred: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
                });
            }
        });
        this.applyJob = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req === null || req === void 0 ? void 0 : req.user;
                const response = yield job_service_1.default.applyForJob(req.body, id);
                return res.json(response);
            }
            catch (error) {
                return res.status(400).json({
                    status: false,
                    message: `An error occurred: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
                });
            }
        });
        this.getAllJobs = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield job_service_1.default.getAllJobs();
                return res.json(response);
            }
            catch (error) {
                return res.status(400).json({
                    status: false,
                    message: `An error occurred: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
                });
            }
        });
        this.getOngoingJobs = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const id = (_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.id;
                const status = (_b = req === null || req === void 0 ? void 0 : req.query) === null || _b === void 0 ? void 0 : _b.status;
                console.log("status", status, req === null || req === void 0 ? void 0 : req.query);
                const response = yield job_service_1.default.getOngoingJobApplication(id, status);
                return res.json(response);
            }
            catch (error) {
                return res.status(400).json({
                    status: false,
                    message: `An error occurred: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
                });
            }
        });
        this.getJobApplicants = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const jobId = (_a = req.query) === null || _a === void 0 ? void 0 : _a.jobId;
                console.log("jobId", jobId);
                const response = yield job_service_1.default.getJobApplicants(jobId);
                return res.json(response);
            }
            catch (error) {
                return res.status(400).json({
                    status: false,
                    message: `An error occurred: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
                });
            }
        });
        this.getOneJobApplicants = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { id } = req === null || req === void 0 ? void 0 : req.user;
                const jobId = (_a = req.query) === null || _a === void 0 ? void 0 : _a.jobId;
                const userId = (_b = req.query) === null || _b === void 0 ? void 0 : _b.userId;
                const response = yield job_service_1.default.getOneJobApplicants(jobId, userId);
                return res.json(response);
            }
            catch (error) {
                return res.status(400).json({
                    status: false,
                    message: `An error occurred: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
                });
            }
        });
        this.getJobDescWithAi = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { design } = req.body;
                console.log("req.params", req.body);
                const response = yield job_service_1.default.generateJobDescWithAi(req.body);
                return res.json(response);
            }
            catch (error) {
                return res.status(400).json({
                    status: false,
                    message: `An error occurred: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
                });
            }
        });
    }
}
const JobController = new jobController();
exports.default = JobController;
