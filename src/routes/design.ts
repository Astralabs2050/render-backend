import { Router } from "express";
import DesignController from "../controllers/design.controller";
import isAuthenticated from "../middleware/authorization";

const designRouter = Router();

designRouter.post(
  "/create-design",
  isAuthenticated as any,
  DesignController.createNewDesign as any,
);

designRouter.get(
  "/get-collection",
  isAuthenticated as any,
  DesignController.getUserCollection as any
)

designRouter.get(
  "/get-all-collection",
  DesignController.getAllCollection as any
)

designRouter.post(
  "/post-design",
  isAuthenticated as any,
  DesignController.uploadNewDesign as any,
);

designRouter.patch(
  "/add-creator",
  isAuthenticated as any,
  DesignController.addCreatorToDesign as any,
);

designRouter.patch(
  "/additional-information",
  isAuthenticated as any,
  DesignController.additionalInfromation as any,
);

designRouter.patch(
  "/update-collection-status",
  isAuthenticated as any,
  DesignController.updateStatus as any,
);
designRouter.post("/design-agent",isAuthenticated as any, DesignController.designAgent as any);

export default designRouter;
