const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const escapeRegex = require("../utils/escapeRegex");

/**
 * Builds the five CRUD handlers (create, getAll, getOne, update, remove) for any Mongoose model.
 *
 * options:
 *  - label:        name used in messages, e.g. "Patient"
 *  - populate:     paths to populate in responses
 *  - filterFields: query-string fields that can be used as exact filters (?status=completed)
 *  - searchFields: fields searched by ?search=text (case-insensitive)
 *  - sort:         default sort for the list endpoint
 *  - beforeSave:   async (body) => void      - extra validation before create/update
 *  - beforeDelete: async (doc)  => void      - extra checks before delete
 */
function crudController(Model, options = {}) {
  const {
    label = Model.modelName,
    populate = [],
    filterFields = [],
    searchFields = [],
    sort = { createdAt: -1 },
    beforeSave,
    beforeDelete,
  } = options;

  // Never let the client set these fields
  const cleanBody = (body = {}) => {
    // eslint-disable-next-line no-unused-vars
    const { _id, id, createdAt, updatedAt, __v, ...rest } = body;
    return rest;
  };

  const withPopulate = (query) => (populate.length ? query.populate(populate) : query);

  /* POST / -> 201 Created */
  const create = asyncHandler(async (req, res) => {
    const body = cleanBody(req.body);
    if (beforeSave) await beforeSave(body);

    let doc = await Model.create(body);
    if (populate.length) doc = await doc.populate(populate);

    res.status(201).json({ success: true, data: doc });
  });

  /* GET / -> 200 OK (pagination + filters + search) */
  const getAll = asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

    const filter = {};
    filterFields.forEach((field) => {
      // only accept plain strings (blocks NoSQL operators such as ?status[$ne]=x)
      if (typeof req.query[field] === "string") filter[field] = req.query[field];
    });
    if (typeof req.query.search === "string" && req.query.search.trim() && searchFields.length) {
      const regex = new RegExp(escapeRegex(req.query.search.trim()), "i");
      filter.$or = searchFields.map((field) => ({ [field]: regex }));
    }

    const [data, total] = await Promise.all([
      withPopulate(Model.find(filter)).sort(sort).skip((page - 1) * limit).limit(limit),
      Model.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: data.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data,
    });
  });

  /* GET /:id -> 200 OK or 404 */
  const getOne = asyncHandler(async (req, res) => {
    const doc = await withPopulate(Model.findById(req.params.id));
    if (!doc) throw new AppError(`${label} not found`, 404);
    res.status(200).json({ success: true, data: doc });
  });

  /* PUT /:id -> 200 OK, 400 or 404 */
  const update = asyncHandler(async (req, res) => {
    const body = cleanBody(req.body);
    if (Object.keys(body).length === 0) {
      throw new AppError("Request body is empty - nothing to update", 400);
    }
    if (beforeSave) await beforeSave(body);

    const doc = await withPopulate(
      Model.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true })
    );
    if (!doc) throw new AppError(`${label} not found`, 404);
    res.status(200).json({ success: true, data: doc });
  });

  /* DELETE /:id -> 200 OK, 404 or 409 */
  const remove = asyncHandler(async (req, res) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) throw new AppError(`${label} not found`, 404);
    if (beforeDelete) await beforeDelete(doc);

    await doc.deleteOne();
    res.status(200).json({ success: true, message: `${label} deleted successfully` });
  });

  return { create, getAll, getOne, update, remove };
}

module.exports = crudController;
