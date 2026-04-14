const Request = require("../models/Request");
const Payment = require("../models/Payment");
const Venue = require("../models/Venue");
const User = require("../models/User");

/**
 * Get all venues with their stats
 * @returns {Array} Array of venues with request count and revenue data
 */
const getAllVenuesWithStats = async () => {
  try {
    const venues = await Venue.find().lean();

    const venuesWithStats = await Promise.all(
      venues.map(async (venue) => {
        try {
          const requestCount = await Request.countDocuments({
            venueId: venue._id,
          });

          const payments = await Payment.find({ venueId: venue._id }).lean();
          const totalRevenue = payments.reduce(
            (sum, payment) => sum + ((payment.amount || 0) / 100),
            0
          );

          const approvedRequests = await Request.countDocuments({
            venueId: venue._id,
            status: "approved",
          });

          const pendingRequests = await Request.countDocuments({
            venueId: venue._id,
            status: "pending",
          });

          return {
            _id: venue._id,
            name: venue.name || "Unknown Venue",
            totalRequests: requestCount,
            totalRevenue: parseFloat(totalRevenue.toFixed(2)),
            approvedRequests,
            pendingRequests,
            isActive: venue.isActive || false,
          };
        } catch (err) {
          console.error(`Error processing venue ${venue._id}:`, err);
          return {
            _id: venue._id,
            name: venue.name || "Unknown Venue",
            totalRequests: 0,
            totalRevenue: 0,
            approvedRequests: 0,
            pendingRequests: 0,
            isActive: venue.isActive || false,
          };
        }
      })
    );

    return venuesWithStats;
  } catch (error) {
    console.error("Error getting venues with stats:", error);
    throw error;
  }
};

/**
 * Get detailed revenue data for all venues
 * @returns {Object} Revenue breakdown by venue and totals
 */
const getRevenueBreakdown = async () => {
  try {
    // Get payments and populate both requestId and venueId
    const payments = await Payment.find()
      .populate("requestId")
      .populate("venueId")
      .lean();

    const revenueByVenue = {};
    let totalRevenue = 0;

    payments.forEach((payment) => {
      // Get venue ID from payment or from the request
      let venueId = null;
      let venueName = "Unknown Venue";

      if (payment.venueId) {
        venueId = payment.venueId._id?.toString() || payment.venueId;
        venueName = payment.venueId.name || "Unknown Venue";
      } else if (payment.requestId?.venueId) {
        venueId = payment.requestId.venueId._id?.toString() || payment.requestId.venueId;
        // We might need to fetch venue separately
        venueName = "Unknown Venue"; // Will be updated later if needed
      }

      if (!venueId) return; // Skip if no venue found

      const amount = (payment.amount || 0) / 100; // Convert from cents

      if (!revenueByVenue[venueId]) {
        revenueByVenue[venueId] = {
          venueId,
          venueName,
          totalAmount: 0,
          transactionCount: 0,
          transactions: [],
        };
      }

      revenueByVenue[venueId].totalAmount += amount;
      revenueByVenue[venueId].transactionCount += 1;
      revenueByVenue[venueId].transactions.push({
        amount,
        date: payment.createdAt,
        requestId: payment.requestId?._id || payment.requestId,
        status: payment.status,
      });

      totalRevenue += amount;
    });

    return {
      byVenue: Object.values(revenueByVenue),
      totalRevenue,
      totalTransactions: payments.length,
    };
  } catch (error) {
    console.error("Error getting revenue breakdown:", error);
    throw error;
  }
};

/**
 * Get top performing venues
 * @param {Number} limit - Number of top venues to return
 * @returns {Array} Array of top venues sorted by revenue
 */
const getTopVenues = async (limit = 10) => {
  try {
    const venues = await getAllVenuesWithStats();
    return venues
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);
  } catch (error) {
    console.error("Error getting top venues:", error);
    throw error;
  }
};

/**
 * Get song request details for admin
 * @returns {Array} Array of all song requests with details
 */
const getSongRequestDetails = async () => {
  try {
    const requests = await Request.find()
      .populate("venueId", "name")
      .populate("userId", "name")
      .lean();

    const songStats = {};
    const requestsByStatus = {
      pending: [],
      approved: [],
      rejected: [],
    };

    requests.forEach((request) => {
      // Track by status
      if (requestsByStatus[request.status]) {
        requestsByStatus[request.status].push({
          _id: request._id,
          songName: request.songName || "Unknown",
          artistName: request.artistName || "Unknown",
          venueName: request.venueId?.name || "Unknown",
          userName: request.userId?.name || "Unknown",
          status: request.status,
          createdAt: request.createdAt,
          amount: (request.amount || 0) / 100,
        });
      }

      // Track song popularity
      const songKey = `${request.songName}-${request.artistName}`;
      if (!songStats[songKey]) {
        songStats[songKey] = {
          songName: request.songName || "Unknown",
          artistName: request.artistName || "Unknown",
          totalRequests: 0,
          approvedCount: 0,
          rejectedCount: 0,
          pendingCount: 0,
        };
      }

      songStats[songKey].totalRequests += 1;
      if (request.status === "approved") songStats[songKey].approvedCount += 1;
      if (request.status === "rejected") songStats[songKey].rejectedCount += 1;
      if (request.status === "pending") songStats[songKey].pendingCount += 1;
    });

    return {
      byStatus: requestsByStatus,
      songPopularity: Object.values(songStats)
        .sort((a, b) => b.totalRequests - a.totalRequests)
        .slice(0, 20), // Top 20 songs
      totalRequests: requests.length,
    };
  } catch (error) {
    console.error("Error getting song request details:", error);
    throw error;
  }
};

/**
 * Get comprehensive dashboard summary
 * @returns {Object} All dashboard stats and summary
 */
const getDashboardSummary = async () => {
  try {
    const [venues, revenue, songRequests] = await Promise.all([
      getAllVenuesWithStats(),
      getRevenueBreakdown(),
      getSongRequestDetails(),
    ]);

    const activeVenues = venues.filter((v) => v.isActive).length;
    const inactiveVenues = venues.length - activeVenues;

    const totalRequests = songRequests.totalRequests;
    const totalApproved = songRequests.byStatus.approved.length;
    const totalPending = songRequests.byStatus.pending.length;
    const totalRejected = songRequests.byStatus.rejected.length;
    const approvalRate =
      totalRequests > 0 ? ((totalApproved / totalRequests) * 100).toFixed(2) : 0;

    // Calculate average revenue per venue
    const avgRevenuePerVenue =
      venues.length > 0 ? (revenue.totalRevenue / venues.length).toFixed(2) : 0;

    // Get top songs
    const topSongs = songRequests.songPopularity.slice(0, 5);

    // Get top venues
    const topVenuesList = venues
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    return {
      summary: {
        totalVenues: venues.length,
        activeVenues,
        inactiveVenues,
        totalRevenue: revenue.totalRevenue,
        totalTransactions: revenue.totalTransactions,
        avgRevenuePerVenue: parseFloat(avgRevenuePerVenue),
        totalRequests,
        totalApproved,
        totalPending,
        totalRejected,
        approvalRate: parseFloat(approvalRate),
      },
      venues: {
        all: venues,
        top: topVenuesList,
        count: venues.length,
      },
      revenue: {
        total: revenue.totalRevenue,
        byVenue: revenue.byVenue,
        totalTransactions: revenue.totalTransactions,
      },
      requests: {
        byStatus: songRequests.byStatus,
        topSongs,
        totalRequests,
      },
    };
  } catch (error) {
    console.error("Error getting dashboard summary:", error);
    throw error;
  }
};

module.exports = {
  getAllVenuesWithStats,
  getRevenueBreakdown,
  getTopVenues,
  getSongRequestDetails,
  getDashboardSummary,
};
