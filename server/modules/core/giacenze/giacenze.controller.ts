import type { Request, Response } from "express";
import * as GiacenzeController from "../../../controllers/giacenze-controller";

export class GiacenzeControllerClass {
  getRange = GiacenzeController.getGiacenzeRange;
  getSummary = GiacenzeController.getGiacenzeSummary;
}

export const giacenzeController = new GiacenzeControllerClass();
