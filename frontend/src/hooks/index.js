/**
 * Hooks Index
 * Central export point for all custom hooks
 */

import useRevenue from "./useRevenue";
import useAdminAuth from "./useAdminAuth";
import useAsync from "./useAsync";

export { useRevenue, useAdminAuth, useAsync };

export default {
  useRevenue,
  useAdminAuth,
  useAsync
};
