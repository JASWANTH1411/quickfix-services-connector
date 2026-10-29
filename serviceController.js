const pool = require('../config/db');
const ResponseHandler = require('../utils/responseHandler');

class ServiceController {
  // Get all active categories
  static async getCategories(req, res) {
    try {
      const [categories] = await pool.query(
        `SELECT c.*, COUNT(s.id) AS service_count 
         FROM categories c 
         LEFT JOIN services s ON c.id = s.category_id AND s.is_active = 1 
         WHERE c.is_active = 1 
         GROUP BY c.id 
         ORDER BY c.name ASC`
      );
      return ResponseHandler.success(res, 'Categories fetched successfully', categories);
    } catch (err) {
      return ResponseHandler.error(res, 'Error fetching categories', err.message, 500);
    }
  }

  // Get services by category ID or slug
  static async getServicesByCategory(req, res) {
    try {
      const { categoryId } = req.params;
      const [services] = await pool.query(
        `SELECT s.*, c.name AS category_name, c.icon AS category_icon 
         FROM services s 
         JOIN categories c ON s.category_id = c.id 
         WHERE (s.category_id = ? OR c.slug = ?) AND s.is_active = 1`,
        [categoryId, categoryId]
      );
      return ResponseHandler.success(res, 'Services fetched successfully', services);
    } catch (err) {
      return ResponseHandler.error(res, 'Error fetching services', err.message, 500);
    }
  }

  // Search services or categories
  static async searchServices(req, res) {
    try {
      const { query } = req.query;
      const searchTerm = `%${query || ''}%`;

      const [services] = await pool.query(
        `SELECT s.*, c.name AS category_name, c.icon AS category_icon 
         FROM services s 
         JOIN categories c ON s.category_id = c.id 
         WHERE (s.name LIKE ? OR s.description LIKE ? OR c.name LIKE ?) AND s.is_active = 1`,
        [searchTerm, searchTerm, searchTerm]
      );

      return ResponseHandler.success(res, 'Search results fetched successfully', services);
    } catch (err) {
      return ResponseHandler.error(res, 'Error searching services', err.message, 500);
    }
  }

  // Admin: Create Category
  static async createCategory(req, res) {
    try {
      const { name, description, icon } = req.body;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const image = req.file ? `/uploads/categories/${req.file.filename}` : '/uploads/categories/default.jpg';

      const [result] = await pool.query(
        `INSERT INTO categories (name, slug, description, icon, image) VALUES (?, ?, ?, ?, ?)`,
        [name, slug, description, icon || 'fa-tools', image]
      );

      return ResponseHandler.success(res, 'Category created successfully', { id: result.insertId, name, slug }, 201);
    } catch (err) {
      return ResponseHandler.error(res, 'Failed to create category', err.message, 500);
    }
  }

  // Admin: Create Service
  static async createService(req, res) {
    try {
      const { category_id, name, description, price, unit, estimated_time } = req.body;
      const image = req.file ? `/uploads/services/${req.file.filename}` : '/uploads/services/default.jpg';

      const [result] = await pool.query(
        `INSERT INTO services (category_id, name, description, price, unit, estimated_time, image) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [category_id, name, description, price, unit || 'per job', estimated_time || '60 mins', image]
      );

      return ResponseHandler.success(res, 'Service created successfully', { id: result.insertId, name, price }, 201);
    } catch (err) {
      return ResponseHandler.error(res, 'Failed to create service', err.message, 500);
    }
  }
}

module.exports = ServiceController;
