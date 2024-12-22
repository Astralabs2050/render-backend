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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
const model_1 = require("../model");
const jobApplication_model_1 = require("../model/jobApplication.model");
const savedJob_model_1 = require("../model/savedJob.model");
const axios_1 = __importDefault(require("axios"));
class jobService {
    constructor() {
        this.createJob = (data, userId) => __awaiter(this, void 0, void 0, function* () {
            const transaction = yield db_1.sequelize.transaction();
            try {
                const { designId, description, timeline, manufacturer } = data;
                // Check if the design is valid
                const design = yield model_1.DesignModel.findOne({
                    where: { id: designId },
                });
                if (!design) {
                    return {
                        message: "No design found",
                        status: false,
                    };
                }
                // Check if a job already exists for this design
                const existingJob = yield model_1.JobModel.findOne({
                    where: { designId },
                });
                if (existingJob) {
                    return {
                        message: "A job already exists for this design",
                        status: false,
                    };
                }
                const newJob = yield model_1.JobModel.create({
                    description,
                    timeline,
                    manufacturer,
                    designId,
                    userId,
                }, { transaction });
                yield transaction.commit();
                return {
                    message: "Job created successfully",
                    status: true,
                    data: newJob,
                };
            }
            catch (error) {
                yield transaction.rollback();
                return {
                    message: (error === null || error === void 0 ? void 0 : error.message) || "An error occurred during job creation",
                    status: false,
                };
            }
        });
        this.updateJob = (jobId, timelineStatus) => __awaiter(this, void 0, void 0, function* () {
            try {
                const updatedJob = yield model_1.JobModel.update({ timelineStatus }, { where: { id: jobId } });
                if (updatedJob[0] === 0) {
                    return {
                        message: "No job found with the given ID",
                        status: false,
                    };
                }
                return {
                    message: "Job status updated successfully",
                    status: true,
                };
            }
            catch (error) {
                return {
                    message: (error === null || error === void 0 ? void 0 : error.message) || "An error occurred during job ",
                    status: false,
                };
            }
        });
        this.getSavedJob = (userId) => __awaiter(this, void 0, void 0, function* () {
            try {
                //get all saved jobs by userId
                const savedJobs = yield savedJob_model_1.SavedJobsModel.findAll({
                    where: { userId },
                    include: [
                        {
                            model: model_1.JobModel,
                            as: "job",
                            include: [
                                {
                                    model: model_1.DesignModel,
                                    as: "design",
                                },
                            ],
                        },
                        {
                            model: model_1.UsersModel,
                            as: "user",
                            attributes: {
                                exclude: [
                                    "password",
                                    "isOtpVerified",
                                    "otpCreatedAt",
                                    "isOtpExp",
                                ],
                            }, // Exclude sensitive fields
                        },
                    ],
                });
                // Remove sensitive fields from the user object
                return {
                    message: "Saved jobs fetched successfully",
                    status: true,
                    data: savedJobs,
                };
            }
            catch (error) {
                return {
                    message: (error === null || error === void 0 ? void 0 : error.message) || "An error occurred while fetching saved jobs",
                    status: false,
                };
            }
        });
        this.acceptDeclineJobApplication = (jobId, status, negotiation) => __awaiter(this, void 0, void 0, function* () {
            const transaction = yield db_1.sequelize.transaction();
            try {
                // Fetch the job application
                const jobApplicationFound = yield jobApplication_model_1.JobApplicationModel.findByPk(jobId);
                if (!jobApplicationFound) {
                    return { message: "Job application not found", status: false };
                }
                // Update the job application status
                const [updatedRows] = yield jobApplication_model_1.JobApplicationModel.update({ status, negotiation }, { where: { id: jobId }, transaction });
                // Ensure the update was successful
                if (!updatedRows) {
                    throw new Error("Failed to update job application");
                }
                // If the application is accepted, update the job details
                if (status) {
                    // Verify the userId exists in the UsersModel
                    const userExists = yield model_1.UsersModel.findByPk(jobApplicationFound.userId);
                    if (!userExists) {
                        throw new Error("The associated user for the brandId does not exist. Update failed.");
                    }
                    yield model_1.JobModel.update({
                        timelineStatus: "ongoing",
                        makerId: jobApplicationFound.userId, // Ensure this is a valid user ID
                    }, { where: { id: jobApplicationFound.jobId }, transaction });
                }
                // Commit the transaction
                yield transaction.commit();
                return {
                    message: "Job application updated successfully",
                    status: true,
                };
            }
            catch (error) {
                // Roll back the transaction on error
                yield transaction.rollback();
                return {
                    message: (error === null || error === void 0 ? void 0 : error.message) ||
                        "An error occurred while accepting/declining job application",
                    status: false,
                };
            }
        });
        this.getOngoingJobApplication = (id, filter) => __awaiter(this, void 0, void 0, function* () {
            try {
                const whereClause = {
                    makerId: id,
                };
                // Add timelineStatus to the where clause only if filter is provided
                if (filter) {
                    whereClause.timelineStatus = filter;
                }
                const getJob = yield model_1.JobModel.findAll({
                    where: whereClause,
                    include: [
                        {
                            model: model_1.DesignModel,
                            as: "design",
                            include: [
                                {
                                    model: model_1.MediaModel,
                                    as: "media",
                                },
                                {
                                    model: model_1.PieceModel,
                                    as: "pieces",
                                    include: [
                                        {
                                            model: model_1.MediaModel,
                                            as: "media",
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            model: jobApplication_model_1.JobApplicationModel,
                            as: "job",
                        },
                        {
                            model: model_1.UsersModel,
                            as: "user",
                            include: [
                                {
                                    model: model_1.CreatorModel,
                                    as: "creator", // Alias defined in UsersModel
                                },
                                {
                                    model: model_1.BrandModel,
                                    as: "brand", // Alias defined in UsersModel
                                },
                            ],
                            attributes: {
                                exclude: [
                                    "password",
                                    "isOtpVerified",
                                    "otpCreatedAt",
                                    "isOtpExp",
                                ],
                            }, // Exclude sensitive fields
                        },
                    ],
                });
                return {
                    message: "Ongoing job applications fetched successfully",
                    status: true,
                    data: getJob,
                };
            }
            catch (error) {
                return {
                    message: (error === null || error === void 0 ? void 0 : error.message) ||
                        "An error occurred while fetching ongoing job applications",
                    status: false,
                };
            }
        });
        this.saveJob = (userId, jobId) => __awaiter(this, void 0, void 0, function* () {
            try {
                // check if the job is valid
                const job = yield model_1.JobModel.findOne({ where: { id: jobId } });
                if (!job) {
                    return {
                        message: "No job found",
                        status: false,
                    };
                }
                //save job
                const saveJob = yield savedJob_model_1.SavedJobsModel.create({
                    jobId,
                    userId,
                });
                return {
                    message: "Job saved successfully",
                    status: true,
                    data: saveJob,
                };
            }
            catch (error) {
                return {
                    message: (error === null || error === void 0 ? void 0 : error.message) || "An error occurred while saving the job",
                    status: false,
                };
            }
        });
        this.generateJobDescWithAi = (design) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                // Fetch job details
                if (!design) {
                    return {
                        message: "No design found",
                        status: false,
                    };
                }
                // Extract job details
                const { outfitName, pieceNumber, prompt, creatorType } = design;
                const pieces = (_a = design === null || design === void 0 ? void 0 : design.pieces) === null || _a === void 0 ? void 0 : _a.map((piece) => ({
                    type: piece.pieceType,
                    number: piece.designNumber,
                    price: piece.piecePrice,
                }));
                // Construct the prompt for OpenAI
                const aiPrompt = `
        Create a job description for a maker. The creator is a ${creatorType} looking to bring an AI-generated design to life.
        The design is named "${outfitName}" and consists of ${pieceNumber} pieces. Here's the prompt used for the AI design: "${prompt}".
        The pieces include: ${pieces === null || pieces === void 0 ? void 0 : pieces.map((piece) => `${piece.type} (Design Number: ${piece.number}, Price: ${piece.price})`).join(", ")}.
        Timeline for the job: ${design.timeline}.
        Ensure the description is concise and under 500 characters the response should be returned as a stringified json having just one key jobDescription, that i can parse later with JSON.parse and remove the line break and any type of text formatting.
      `;
                // Query OpenAI API
                const response = yield axios_1.default.post("https://api.openai.com/v1/chat/completions", {
                    model: "gpt-4", // or "gpt-3.5-turbo"
                    messages: [
                        { role: "system", content: "You are a helpful assistant." },
                        { role: "user", content: aiPrompt },
                    ],
                    max_tokens: 150,
                    temperature: 0.7,
                }, {
                    headers: {
                        Authorization: `Bearer ${process.env.OPEN_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                });
                // Assuming content is a string, let's log it before parsing:
                const generatedDescription = (_c = (_b = response.data.choices[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content;
                console.log("generatedDescription", generatedDescription);
                // If it's not a valid JSON, try parsing only if it's a valid stringified object.
                let parsedDescription;
                try {
                    parsedDescription = JSON.parse(generatedDescription);
                }
                catch (error) {
                    console.log("Content is not valid JSON, using raw string");
                    parsedDescription = generatedDescription; // Fallback to raw string if it's not JSON
                }
                if (generatedDescription) {
                    return {
                        message: "Job description generated successfully",
                        data: JSON.parse(parsedDescription),
                        status: true,
                    };
                }
                else {
                    return {
                        message: "No content generated by OpenAI",
                        status: false,
                    };
                }
            }
            catch (error) {
                return {
                    message: (error === null || error === void 0 ? void 0 : error.message) ||
                        "An error occurred while generating the job description",
                    status: false,
                };
            }
        });
        this.getJob = (userId, status) => __awaiter(this, void 0, void 0, function* () {
            try {
                const jobs = yield model_1.JobModel.findAll({
                    where: Object.assign({ userId }, (status !== undefined && { status })),
                    include: [
                        {
                            model: model_1.DesignModel,
                            as: "design",
                            include: [
                                {
                                    model: model_1.MediaModel,
                                    as: "media", // Include all media associated with the design
                                },
                                {
                                    model: model_1.PieceModel,
                                    as: "pieces", // Include all pieces associated with the design
                                },
                            ],
                        },
                        {
                            model: model_1.UsersModel,
                            as: "user",
                            attributes: {
                                exclude: [
                                    "password",
                                    "isOtpVerified",
                                    "otpCreatedAt",
                                    "isOtpExp",
                                ],
                            }, // Exclude sensitive fields
                        },
                    ],
                });
                return {
                    status: true,
                    message: "gotten all jobs",
                    data: jobs,
                };
            }
            catch (error) {
                console.error("Error fetching jobs:", error);
                throw error;
            }
        });
        this.getEachJob = (jobId, authUser) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const job = yield model_1.JobModel.findOne({
                    where: { id: jobId },
                    include: [
                        {
                            model: model_1.DesignModel,
                            as: "design",
                            include: [
                                {
                                    model: model_1.MediaModel,
                                    as: "media",
                                },
                                {
                                    model: model_1.PieceModel,
                                    as: "pieces",
                                    include: [
                                        {
                                            model: model_1.MediaModel,
                                            as: "media",
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            model: model_1.UsersModel,
                            as: "user",
                            include: [
                                {
                                    model: model_1.CreatorModel,
                                    as: "creator", // Alias defined in UsersModel
                                },
                                {
                                    model: model_1.BrandModel,
                                    as: "brand", // Alias defined in UsersModel
                                },
                            ],
                            attributes: {
                                exclude: [
                                    "password",
                                    "isOtpVerified",
                                    "otpCreatedAt",
                                    "isOtpExp",
                                ],
                            }, // Exclude sensitive fields
                        },
                    ],
                });
                if (!job) {
                    return {
                        message: "No job found",
                        status: false,
                    };
                }
                //logic for increasing job impression
                //check who is acessing the end point
                // if the user is not the owner of the job, increase impression count
                // if the user is the owner, return the job as it is
                // if the user is not authenticated, return the job as it is
                // if the user is authenticated and the owner, return the job with increased impression count
                if (((_a = job === null || job === void 0 ? void 0 : job.dataValues) === null || _a === void 0 ? void 0 : _a.userId) !== (authUser === null || authUser === void 0 ? void 0 : authUser.id)) {
                    //increasing impression
                    console.log("increasing job impression", (_b = job === null || job === void 0 ? void 0 : job.dataValues) === null || _b === void 0 ? void 0 : _b.impression);
                    //null case
                    if (((_c = job === null || job === void 0 ? void 0 : job.dataValues) === null || _c === void 0 ? void 0 : _c.impression) === null) {
                        yield model_1.JobModel.update({ impression: 1 }, { where: { id: jobId } });
                    }
                    yield model_1.JobModel.increment("impression", { where: { id: jobId } });
                }
                return {
                    status: true,
                    message: "gotten job",
                    data: job,
                };
            }
            catch (error) {
                console.error("Error fetching job:", error);
                throw error;
            }
        });
        this.getAllJobs = () => __awaiter(this, void 0, void 0, function* () {
            try {
                const jobs = yield model_1.JobModel.findAll({
                    where: {
                        status: false,
                    },
                    include: [
                        {
                            model: model_1.DesignModel,
                            as: "design",
                        },
                        {
                            model: model_1.UsersModel,
                            as: "user",
                            attributes: {
                                exclude: [
                                    "password",
                                    "isOtpVerified",
                                    "otpCreatedAt",
                                    "isOtpExp",
                                ],
                            }, // Exclude sensitive fields
                        },
                    ],
                });
                return {
                    status: true,
                    message: "gotten all jobs",
                    data: jobs,
                };
            }
            catch (error) { }
        });
        this.applyForJob = (data, userId) => __awaiter(this, void 0, void 0, function* () {
            const transaction = yield db_1.sequelize.transaction();
            try {
                // Check if the job is valid
                const job = yield model_1.JobModel.findOne({
                    where: { id: data === null || data === void 0 ? void 0 : data.jobId },
                });
                if (!job) {
                    return {
                        message: "No job found",
                        status: false,
                    };
                }
                // Check if the user has already applied for this job
                const existingApplication = yield jobApplication_model_1.JobApplicationModel.findOne({
                    where: { jobId: data === null || data === void 0 ? void 0 : data.jobId, userId },
                });
                if (existingApplication) {
                    return {
                        message: "You have already applied for this job",
                        status: false,
                    };
                }
                // Validate that the project IDs exist (if provided)
                if ((data === null || data === void 0 ? void 0 : data.projectIds) && Array.isArray(data.projectIds)) {
                    // Check each project ID to see if it exists
                    for (const projectId of data.projectIds) {
                        const project = yield model_1.ProjectModel.findOne({
                            where: { id: projectId },
                        });
                        if (!project) {
                            return {
                                message: `Invalid project ID: ${projectId}`,
                                status: false,
                            };
                        }
                    }
                }
                // Create the job application
                const newApplication = yield jobApplication_model_1.JobApplicationModel.create({
                    userId,
                    jobId: data === null || data === void 0 ? void 0 : data.jobId,
                    amount: data === null || data === void 0 ? void 0 : data.amount,
                    wallet: data === null || data === void 0 ? void 0 : data.wallet,
                }, { transaction });
                // If projectIds are provided, associate them with the job application via the join table
                if ((data === null || data === void 0 ? void 0 : data.projectIds) && Array.isArray(data.projectIds)) {
                    const projectAssociations = data.projectIds.map((projectId) => ({
                        jobApplicationId: newApplication.id,
                        projectId,
                    }));
                    // Create associations in the join table
                    yield model_1.JobApplicationProjects.bulkCreate(projectAssociations, {
                        transaction,
                    });
                }
                yield transaction.commit();
                return {
                    message: "Application created successfully",
                    status: true,
                    data: newApplication,
                };
            }
            catch (error) {
                yield transaction.rollback(); // Rollback transaction on error
                return {
                    message: "An error occurred while applying for the job",
                    status: false,
                    error: error.message,
                };
            }
        });
        this.getJobApplicants = (jobId) => __awaiter(this, void 0, void 0, function* () {
            try {
                // Check if the job exists
                const job = yield model_1.JobModel.findOne({
                    where: { id: jobId },
                });
                if (!job) {
                    return {
                        message: "No job found",
                        status: false,
                    };
                }
                // Get applications for the job with pagination
                const { rows: jobApplications, count: totalApplications } = yield jobApplication_model_1.JobApplicationModel.findAndCountAll({
                    where: { jobId },
                    include: [
                        {
                            model: model_1.UsersModel,
                            as: "user",
                            include: [
                                {
                                    model: model_1.CreatorModel,
                                    as: "creator", // Alias defined in UsersModel
                                },
                                {
                                    model: model_1.BrandModel,
                                    as: "brand", // Alias defined in UsersModel
                                },
                            ],
                        },
                    ],
                });
                const sanitizedData = jobApplications.map((application) => {
                    const _a = application.toJSON(), { user } = _a, applicationDetails = __rest(_a, ["user"]); // Convert Sequelize object to JSON
                    if (user) {
                        // Remove sensitive fields
                        delete user.password;
                        delete user.isOtpVerified;
                        delete user.otpCreatedAt;
                        delete user.isOtpExp;
                    }
                    return Object.assign(Object.assign({}, applicationDetails), { user });
                });
                return {
                    status: true,
                    message: "Got all job applicants",
                    data: sanitizedData,
                };
            }
            catch (error) {
                throw error;
            }
        });
        this.getOneJobApplicants = (jobId, userId) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            try {
                // Check if the job exists
                const job = yield model_1.JobModel.findOne({
                    where: { id: jobId },
                });
                if (!job) {
                    return {
                        message: "No job found",
                        status: false,
                    };
                }
                // Get applications for the job with pagination
                const jobApplications = yield jobApplication_model_1.JobApplicationModel.findOne({
                    where: {
                        jobId: (_a = job === null || job === void 0 ? void 0 : job.dataValues) === null || _a === void 0 ? void 0 : _a.id,
                        userId,
                    },
                    include: [
                        {
                            model: model_1.UsersModel,
                            as: "user",
                            include: [
                                {
                                    model: model_1.CreatorModel,
                                    as: "creator", // Alias defined in UsersModel
                                },
                                {
                                    model: model_1.BrandModel,
                                    as: "brand", // Alias defined in UsersModel
                                },
                            ],
                        },
                    ],
                });
                if (jobApplications === null || jobApplications === void 0 ? void 0 : jobApplications.user) {
                    jobApplications.user.password = null;
                    jobApplications.user.isOtpVerified = null;
                    jobApplications.user.otpCreatedAt = null;
                    jobApplications.user.isOtpExp = null;
                    (_b = jobApplications === null || jobApplications === void 0 ? void 0 : jobApplications.user) === null || _b === void 0 ? true : delete _b.password;
                    (_c = jobApplications === null || jobApplications === void 0 ? void 0 : jobApplications.user) === null || _c === void 0 ? true : delete _c.isOtpVerified;
                    (_d = jobApplications === null || jobApplications === void 0 ? void 0 : jobApplications.user) === null || _d === void 0 ? true : delete _d.otpCreatedAt;
                    (_e = jobApplications === null || jobApplications === void 0 ? void 0 : jobApplications.user) === null || _e === void 0 ? true : delete _e.isOtpExp;
                }
                return {
                    status: true,
                    message: "Got job applicant",
                    data: jobApplications,
                };
            }
            catch (error) {
                console.error("Error getting job application:", error);
                throw error;
            }
        });
    }
}
const JobService = new jobService();
exports.default = JobService;
