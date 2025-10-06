import * as GiacenzeController from "../../../controllers/giacenze-controller";

export class GiacenzeService {
  getRange = GiacenzeController.getGiacenzeRange;
  getSummary = GiacenzeController.getGiacenzeSummary;
}

export const giacenzeService = new GiacenzeService();
