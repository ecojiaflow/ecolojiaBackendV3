// backend/src/models/AffiliateClick.js
const mongoose = require('mongoose');

const affiliateClickSchema = new mongoose.Schema({
  // Tracking de base
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  
  // Détails affiliation
  partner: {
    type: String,
    enum: ['lafourche', 'kazidomi', 'greenweez'],
    required: true,
    index: true
  },
  originalUrl: {
    type: String,
    required: true
  },
  affiliateUrl: {
    type: String,
    required: true
  },
  
  // Tracking avancé
  clickId: {
    type: String,
    unique: true,
    required: true,
    default: () => `click_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  campaign: {
    type: String,
    default: 'organic'
  },
  source: {
    type: String,
    enum: ['product_page', 'alternatives', 'chat_recommendation', 'search_results'],
    default: 'product_page'
  },
  
  // Conversion tracking
  converted: {
    type: Boolean,
    default: false
  },
  conversionDate: Date,
  orderValue: Number,
  commission: Number,
  commissionStatus: {
    type: String,
    enum: ['pending', 'approved', 'paid', 'cancelled'],
    default: 'pending'
  },
  
  // Metadata
  userAgent: String,
  ipAddress: String,
  referer: String,
  utmParams: {
    source: String,
    medium: String,
    campaign: String,
    term: String,
    content: String
  },
  
  // TTL pour conformité RGPD (12 mois)
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true
});

// Index composés pour analytics
affiliateClickSchema.index({ partner: 1, createdAt: -1 });
affiliateClickSchema.index({ userId: 1, partner: 1, createdAt: -1 });
affiliateClickSchema.index({ clickId: 1 }, { unique: true });
affiliateClickSchema.index({ converted: 1, partner: 1 });

// Méthodes statiques
affiliateClickSchema.statics.createClick = async function(data) {
  const click = new this(data);
  await click.save();
  
  // Incrémenter le compteur de l'utilisateur si nécessaire
  // await User.findByIdAndUpdate(data.userId, { $inc: { 'stats.affiliateClicks': 1 } });
  
  return click;
};

affiliateClickSchema.statics.recordConversion = async function(clickId, orderData) {
  const click = await this.findOne({ clickId });
  if (!click) throw new Error('Click not found');
  
  click.converted = true;
  click.conversionDate = new Date();
  click.orderValue = orderData.value;
  click.commission = orderData.value * this.getCommissionRate(click.partner);
  
  await click.save();
  return click;
};

affiliateClickSchema.statics.getCommissionRate = function(partner) {
  const rates = {
    lafourche: 0.07,    // 7%
    kazidomi: 0.10,     // 10%
    greenweez: 0.05     // 5%
  };
  return rates[partner] || 0.05;
};

affiliateClickSchema.statics.getPartnerStats = async function(partner, period = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);
  
  const stats = await this.aggregate([
    {
      $match: {
        partner,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalClicks: { $sum: 1 },
        conversions: {
          $sum: { $cond: ['$converted', 1, 0] }
        },
        totalRevenue: {
          $sum: { $ifNull: ['$orderValue', 0] }
        },
        totalCommission: {
          $sum: { $ifNull: ['$commission', 0] }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalClicks: 1,
        conversions: 1,
        conversionRate: {
          $cond: [
            { $eq: ['$totalClicks', 0] },
            0,
            { $multiply: [{ $divide: ['$conversions', '$totalClicks'] }, 100] }
          ]
        },
        totalRevenue: { $round: ['$totalRevenue', 2] },
        totalCommission: { $round: ['$totalCommission', 2] },
        averageOrderValue: {
          $cond: [
            { $eq: ['$conversions', 0] },
            0,
            { $round: [{ $divide: ['$totalRevenue', '$conversions'] }, 2] }
          ]
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalClicks: 0,
    conversions: 0,
    conversionRate: 0,
    totalRevenue: 0,
    totalCommission: 0,
    averageOrderValue: 0
  };
};

affiliateClickSchema.statics.getUserAffiliateHistory = async function(userId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;
  
  const clicks = await this.find({ userId })
    .populate('productId', 'name brand imageUrl')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
    
  const total = await this.countDocuments({ userId });
  
  return {
    clicks,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit)
    }
  };
};

module.exports = mongoose.model('AffiliateClick', affiliateClickSchema);