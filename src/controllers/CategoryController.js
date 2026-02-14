const Category = require('../models/CategoryModel');

exports.getAll = (req, res) => {
  Category.getAll((err, data) => {
    if (err) return res.status(500).json(err);
    res.json(data);
  });
};

exports.create = (req, res) => {
  Category.create(req.body, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Created' });
  });
};

exports.update = (req, res) => {
  Category.update(req.params.id, req.body, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Updated' });
  });
};

exports.delete = (req, res) => {
  Category.delete(req.params.id, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Deleted' });
  });
};
