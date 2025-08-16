import mongoose from 'mongoose';

export class DatabaseService {
  // Generic find one with population
  static async findOne(model, query, populate = [], options = {}) {
    try {
      let queryBuilder = model.findOne(query);
      
      // Apply population
      populate.forEach(field => {
        queryBuilder = queryBuilder.populate(field);
      });
      
      // Apply options
      if (options.select) {
        queryBuilder = queryBuilder.select(options.select);
      }
      
      if (options.lean) {
        queryBuilder = queryBuilder.lean();
      }
      
      return await queryBuilder.exec();
    } catch (error) {
      throw new Error(`Database findOne failed: ${error.message}`);
    }
  }

  // Generic find many with pagination, sorting, and filtering
  static async findMany(model, query = {}, options = {}) {
    try {
      const {
        populate = [],
        select = null,
        sort = { createdAt: -1 },
        page = 1,
        limit = 10,
        lean = false,
        skip = null
      } = options;

      let queryBuilder = model.find(query);
      
      // Apply population
      populate.forEach(field => {
        queryBuilder = queryBuilder.populate(field);
      });
      
      // Apply selection
      if (select) {
        queryBuilder = queryBuilder.select(select);
      }
      
      // Apply sorting
      queryBuilder = queryBuilder.sort(sort);
      
      // Apply pagination
      if (skip !== null) {
        queryBuilder = queryBuilder.skip(skip);
      } else if (page && limit) {
        queryBuilder = queryBuilder.skip((page - 1) * limit);
      }
      
      if (limit) {
        queryBuilder = queryBuilder.limit(limit);
      }
      
      // Apply lean option
      if (lean) {
        queryBuilder = queryBuilder.lean();
      }
      
      const results = await queryBuilder.exec();
      
      // Get total count for pagination
      let total = null;
      if (page && limit) {
        total = await model.countDocuments(query);
      }
      
      return {
        results,
        total,
        page,
        limit,
        totalPages: total ? Math.ceil(total / limit) : null
      };
    } catch (error) {
      throw new Error(`Database findMany failed: ${error.message}`);
    }
  }

  // Generic create
  static async create(model, data) {
    try {
      const document = new model(data);
      return await document.save();
    } catch (error) {
      throw new Error(`Database create failed: ${error.message}`);
    }
  }

  // Generic update
  static async update(model, query, updateData, options = {}) {
    try {
      const {
        new: returnNew = true,
        runValidators = true,
        upsert = false
      } = options;

      return await model.findOneAndUpdate(
        query,
        updateData,
        {
          new: returnNew,
          runValidators,
          upsert
        }
      );
    } catch (error) {
      throw new Error(`Database update failed: ${error.message}`);
    }
  }

  // Generic delete
  static async delete(model, query) {
    try {
      return await model.findOneAndDelete(query);
    } catch (error) {
      throw new Error(`Database delete failed: ${error.message}`);
    }
  }

  // Generic delete many
  static async deleteMany(model, query) {
    try {
      const result = await model.deleteMany(query);
      return result;
    } catch (error) {
      throw new Error(`Database deleteMany failed: ${error.message}`);
    }
  }

  // Generic count
  static async count(model, query = {}) {
    try {
      return await model.countDocuments(query);
    } catch (error) {
      throw new Error(`Database count failed: ${error.message}`);
    }
  }

  // Generic aggregate
  static async aggregate(model, pipeline) {
    try {
      return await model.aggregate(pipeline);
    } catch (error) {
      throw new Error(`Database aggregate failed: ${error.message}`);
    }
  }

  // Generic distinct
  static async distinct(model, field, query = {}) {
    try {
      return await model.distinct(field, query);
    } catch (error) {
      throw new Error(`Database distinct failed: ${error.message}`);
    }
  }

  // Generic exists
  static async exists(model, query) {
    try {
      return await model.exists(query);
    } catch (error) {
      throw new Error(`Database exists failed: ${error.message}`);
    }
  }

  // Generic find by ID
  static async findById(model, id, populate = [], options = {}) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('Invalid ObjectId');
      }

      return await this.findOne(model, { _id: id }, populate, options);
    } catch (error) {
      throw new Error(`Database findById failed: ${error.message}`);
    }
  }

  // Generic find by ID and update
  static async findByIdAndUpdate(model, id, updateData, options = {}) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('Invalid ObjectId');
      }

      return await this.update(model, { _id: id }, updateData, options);
    } catch (error) {
      throw new Error(`Database findByIdAndUpdate failed: ${error.message}`);
    }
  }

  // Generic find by ID and delete
  static async findByIdAndDelete(model, id) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('Invalid ObjectId');
      }

      return await this.delete(model, { _id: id });
    } catch (error) {
      throw new Error(`Database findByIdAndDelete failed: ${error.message}`);
    }
  }

  // Search with text index
  static async search(model, searchQuery, options = {}) {
    try {
      const {
        fields = [],
        populate = [],
        select = null,
        sort = { score: { $meta: 'textScore' } },
        page = 1,
        limit = 10,
        lean = false
      } = options;

      let query = {};
      
      if (searchQuery && searchQuery.trim()) {
        if (fields.length > 0) {
          // Search in specific fields
          const searchRegex = new RegExp(searchQuery, 'i');
          const fieldQueries = fields.map(field => ({
            [field]: searchRegex
          }));
          query = { $or: fieldQueries };
        } else {
          // Use text search if available
          query = { $text: { $search: searchQuery } };
        }
      }

      return await this.findMany(model, query, {
        populate,
        select,
        sort,
        page,
        limit,
        lean
      });
    } catch (error) {
      throw new Error(`Database search failed: ${error.message}`);
    }
  }

  // Advanced filtering with operators
  static async filter(model, filters, options = {}) {
    try {
      const {
        populate = [],
        select = null,
        sort = { createdAt: -1 },
        page = 1,
        limit = 10,
        lean = false
      } = options;

      let query = {};

      // Process filters
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        
        if (value !== undefined && value !== null && value !== '') {
          if (typeof value === 'object' && !Array.isArray(value)) {
            // Handle operators like $gt, $lt, $in, etc.
            query[key] = value;
          } else if (Array.isArray(value)) {
            // Handle array values
            if (value.length > 0) {
              query[key] = { $in: value };
            }
          } else {
            // Handle simple equality
            query[key] = value;
          }
        }
      });

      return await this.findMany(model, query, {
        populate,
        select,
        sort,
        page,
        limit,
        lean
      });
    } catch (error) {
      throw new Error(`Database filter failed: ${error.message}`);
    }
  }

  // Bulk operations
  static async bulkWrite(model, operations) {
    try {
      return await model.bulkWrite(operations);
    } catch (error) {
      throw new Error(`Database bulkWrite failed: ${error.message}`);
    }
  }

  // Transaction wrapper
  static async withTransaction(callback) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Health check
  static async healthCheck() {
    try {
      const adminDb = mongoose.connection.db.admin();
      const result = await adminDb.ping();
      
      return {
        status: 'healthy',
        database: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        readyState: mongoose.connection.readyState,
        ping: result.ok === 1 ? 'success' : 'failed'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        readyState: mongoose.connection.readyState
      };
    }
  }

  // Get collection statistics
  static async getCollectionStats(model) {
    try {
      const stats = await model.collection.stats();
      return {
        collection: model.collection.name,
        count: stats.count,
        size: stats.size,
        avgObjSize: stats.avgObjSize,
        storageSize: stats.storageSize,
        indexes: stats.nindexes,
        totalIndexSize: stats.totalIndexSize
      };
    } catch (error) {
      throw new Error(`Failed to get collection stats: ${error.message}`);
    }
  }

  // Create indexes
  static async createIndexes(model, indexes) {
    try {
      return await model.collection.createIndexes(indexes);
    } catch (error) {
      throw new Error(`Failed to create indexes: ${error.message}`);
    }
  }

  // Drop indexes
  static async dropIndexes(model) {
    try {
      return await model.collection.dropIndexes();
    } catch (error) {
      throw new Error(`Failed to drop indexes: ${error.message}`);
    }
  }
}

// Export utility functions
export const findOne = DatabaseService.findOne.bind(DatabaseService);
export const findMany = DatabaseService.findMany.bind(DatabaseService);
export const create = DatabaseService.create.bind(DatabaseService);
export const update = DatabaseService.update.bind(DatabaseService);
export const deleteOne = DatabaseService.delete.bind(DatabaseService);
export const deleteMany = DatabaseService.deleteMany.bind(DatabaseService);
export const count = DatabaseService.count.bind(DatabaseService);
export const aggregate = DatabaseService.aggregate.bind(DatabaseService);
export const search = DatabaseService.search.bind(DatabaseService);
export const filter = DatabaseService.filter.bind(DatabaseService);
