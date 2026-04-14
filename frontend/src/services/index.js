/**
 * Frontend Services Index
 * Central export point for all service modules
 */

import revenueService from "./revenueService";
import requestService from "./paymentService"; // Actually request service (naming is from previous file)
import * as venueService from "./venueService";
import { API_CONFIG, HEADERS } from "./apiConfig";

export {
  revenueService,
  requestService,
  venueService,
  API_CONFIG,
  HEADERS
};

export default {
  revenue: revenueService,
  request: requestService,
  venue: venueService,
  config: API_CONFIG
};
