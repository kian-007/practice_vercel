const {
  createUrl,
  getUrls,
  getUrlForRedirect,
  deleteUrl,
} = require("../services/urlService");

// Create a shortened URL
async function handleCreateUrl(req, res) {
  const { originalUrl, expiresAt } = req.body;

  // Validate required input
  if (!originalUrl) {
    return res.status(400).json({
      success: false,
      message: "originalUrl is required",
    });
  }

  // Call service to create the URL
  const url = await createUrl(req.user.id, originalUrl, expiresAt);

  // Send the creation response
  return res.status(201).json({
    success: true,
    url,
    message: "URL created successfully",
  });
}

// Get URLs with pagination
async function handleGetUrls(req, res) {
  // Calculate page and limit from query parameters
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 50);

  // Get URLs and pagination data from service
  const result = await getUrls(page, limit);

  // Send the list response
  return res.status(200).json({
    success: true,
    urls: result.urls,
    pagination: result.pagination,
  });
}

// Redirect a short URL to its original destination
async function redirectUrl(req, res) {
  const { shortCode } = req.params;

  // Find the URL and check its status
  const result = await getUrlForRedirect(shortCode);

  // Handle a short URL that doesn't exist
  if (result.status === "not_found") {
    return res.status(404).json({
      success: false,
      message: "Short URL not found",
    });
  }

  // Handle an expired short URL
  if (result.status === "expired") {
    return res.status(410).json({
      success: false,
      message: "Short URL has expired",
    });
  }

  // Redirect to the original URL
  return res.redirect(302, result.originalUrl);
}

// Delete a URL
async function handleDeleteUrl(req, res) {
  const { id } = req.params;

  // Delete only if the URL belongs to the current user
  const deletedUrl = await deleteUrl(id, req.user.id);

  // Handle a missing URL or insufficient ownership
  if (!deletedUrl) {
    return res.status(404).json({
      success: false,
      message: "URL not found or you don't have permission to delete it",
    });
  }

  // Send the deletion response
  return res.status(200).json({
    success: true,
    message: "URL deleted successfully",
  });
}

// Export controllers for use in routes
module.exports = {
  handleCreateUrl,
  handleGetUrls,
  redirectUrl,
  handleDeleteUrl,
};
