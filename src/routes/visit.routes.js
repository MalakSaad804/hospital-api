const express = require("express");
const controller = require("../controllers/visit.controller");
const validateObjectId = require("../middleware/validateObjectId");

const router = express.Router();

router.route("/").get(controller.getAll).post(controller.create);

router
  .route("/:id")
  .all(validateObjectId)
  .get(controller.getOne)
  .put(controller.update)
  .delete(controller.remove);

module.exports = router;
