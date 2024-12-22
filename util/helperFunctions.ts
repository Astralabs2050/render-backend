import { MediaModel, UsersModel, ProjectModel } from "../src/model";

// Function to upload a single media file associated with a user or project
export const uploadSingleMedia = async (
  entityId: string,
  mediaType: string,
  link: string,
  entityType?: "user" | "project",
  transaction?: any,
  model?: any,
) => {
  try {
    let entityExists;

    // Check if the entity exists based on entityType
    if (entityType === "project") {
      entityExists = await ProjectModel.findOne({ where: { id: entityId } });
    } else if (entityType === "user") {
      entityExists = await UsersModel.findOne({
        where: { id: entityId },
        transaction,
      });
    }

    // If the entity does not exist, log a warning but continue with media creation
    if (entityType && !entityExists) {
      console.warn(
        `Warning: ${
          entityType?.charAt(0).toUpperCase() + entityType?.slice(1)
        } with id ${entityId} does not exist. Media will still be created.`,
      );
    }

    // Create new media record regardless of entity existence
    const mediaData = {
      link,
      mediaType,
      ...(entityType === "project"
        ? { projectId: entityId }
        : { userId: entityId }), // Set either projectId or userId
    };

    // Create the media record
    const newMedia = await MediaModel.create(mediaData, { transaction });

    return {
      success: true,
      message: "profileImage: Media uploaded successfully",
      media: newMedia, // Optionally return the created media
    };
  } catch (err: any) {
    return {
      success: false,
      message:
        "profileImage: " +
        (err.message || "An error occurred while uploading the media"),
    };
  }
};

// Function to retrieve uploaded media associated with a user or project
export const getSingleUploadedMedia = async (
  entityId: string,
  mediaType: string,
  entityType: "user" | "project",
) => {
  try {
    let entityExists;

    // Check if the entity exists
    if (entityType === "user") {
      entityExists = await UsersModel.findOne({ where: { id: entityId } });
    } else if (entityType === "project") {
      entityExists = await ProjectModel.findOne({ where: { id: entityId } });
    } else {
      throw new Error("Invalid entity type specified");
    }

    if (!entityExists) {
      throw new Error(`Entity with id ${entityId} does not exist`);
    }

    // Fetch the existing media for the entity and media type
    const existingMedia = await MediaModel.findOne({
      where: {
        entityId,
        mediaType,
        entityType, // Check the entity type to retrieve the correct media
      },
    });

    if (existingMedia) {
      return {
        success: true,
        link: existingMedia.link,
      };
    } else {
      throw new Error("No such media found");
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "An error occurred while fetching the media",
    };
  }
};
