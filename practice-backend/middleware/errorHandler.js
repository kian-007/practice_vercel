//-------error 404----------
function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: "Route not found" });
}

//-------error 500----------
function errorHandler(err, req, res, next) {
  console.error(err);
  res
    .status(500)
    .json({ success: false, message: "Something went wrong on the server" });
}

module.exports = { notFoundHandler, errorHandler };
