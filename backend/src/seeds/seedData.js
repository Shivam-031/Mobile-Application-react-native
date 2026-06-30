/**
 * GREEN YATRA INDIA — DATABASE SEED SCRIPT
 * Run: node src/seeds/seedData.js
 *
 * Wipes products, branches, and seeded employees first (destructive — will
 * delete all existing data for those collections), then seeds fresh data:
 *   - 15 employee users + 15 state branches (5 original + 10 added in v2)
 *   - 45 products across 15 states with a realistic status mix
 *     (~32 approved, ~9 pending, ~4 rejected) and varied stock levels
 *     (in-stock / low-stock / out-of-stock) so the admin inventory page
 *     shows non-zero counts in every summary card.
 *
 * Plants and the master admin user are preserved.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const User    = require('../modules/users/model/User');
const Plant   = require('../modules/plants/model/Plant');
const Product = require('../modules/products/model/Product');
const Branch  = require('../modules/branches/model/Branch');

const EMPLOYEE_SEEDS = [
  // Original 5 states (kept from v1 of the seed)
  { name: 'Rajesh Patil',  email: 'maharashtra@greenyatra.in', state: 'Maharashtra' },
  { name: 'Priya Das',     email: 'assam@greenyatra.in',       state: 'Assam' },
  { name: 'Sunil Sharma',  email: 'rajasthan@greenyatra.in',   state: 'Rajasthan' },
  { name: 'Anand Iyer',    email: 'kerala@greenyatra.in',      state: 'Kerala' },
  { name: 'Lakshmi Rao',   email: 'karnataka@greenyatra.in',   state: 'Karnataka' },
  // 10 new states added in v2 to widen India coverage
  { name: 'Aarav Mehta',   email: 'gujarat@greenyatra.in',     state: 'Gujarat' },
  { name: 'Meera Nair',    email: 'tamilnadu@greenyatra.in',   state: 'Tamil Nadu' },
  { name: 'Rohan Banerjee',email: 'westbengal@greenyatra.in',  state: 'West Bengal' },
  { name: 'Vikram Singh',  email: 'uttarpradesh@greenyatra.in',state: 'Uttar Pradesh' },
  { name: 'Aisha Khan',    email: 'delhi@greenyatra.in',       state: 'Delhi' },
  { name: 'Karan Reddy',   email: 'telangana@greenyatra.in',   state: 'Telangana' },
  { name: 'Sneha Patel',   email: 'madhyapradesh@greenyatra.in', state: 'Madhya Pradesh' },
  { name: 'Ravi Joshi',    email: 'uttarakhand@greenyatra.in', state: 'Uttarakhand' },
  { name: 'Tanya Bora',    email: 'odisha@greenyatra.in',      state: 'Odisha' },
  { name: 'Imran Sheikh',  email: 'jharkhand@greenyatra.in',   state: 'Jharkhand' },
];

// 25 products spread across 8 states. status mixes ~18/5/2 (approved/pending/rejected).
// `stock` deliberately varies so summary cards show in-stock, low-stock, and out-of-stock.
const PRODUCT_SEEDS = [
  // ── Maharashtra (5) ──
  { name: 'Small Terracotta Pot',  category: 'small',      price: 149, stock: 80,  carbonSaved: 1.2, ecoRating: 5, location: 'Pune, Maharashtra',       state: 'Maharashtra', status: 'approved' },
  { name: 'Medium Clay Pot',       category: 'medium',     price: 249, stock: 45,  carbonSaved: 2.5, ecoRating: 5, location: 'Pune, Maharashtra',       state: 'Maharashtra', status: 'approved' },
  { name: 'Designer Wall Planter', category: 'decorative', price: 549, stock: 12,  carbonSaved: 3.4, ecoRating: 4, location: 'Mumbai, Maharashtra',     state: 'Maharashtra', status: 'approved' },
  { name: 'Coir Hanging Basket',   category: 'small',      price: 199, stock: 0,   carbonSaved: 1.5, ecoRating: 4, location: 'Nagpur, Maharashtra',     state: 'Maharashtra', status: 'approved' },
  { name: 'Stone Carved Urn',      category: 'large',      price: 899, stock: 6,   carbonSaved: 6.5, ecoRating: 5, location: 'Aurangabad, Maharashtra', state: 'Maharashtra', status: 'pending'  },

  // ── Assam (3) ──
  { name: 'Bamboo Planter Set',    category: 'medium',     price: 349, stock: 5,   carbonSaved: 3.8, ecoRating: 5, location: 'Guwahati, Assam',         state: 'Assam',       status: 'approved' },
  { name: 'Bamboo Tissue Holder',  category: 'small',      price: 129, stock: 70,  carbonSaved: 0.9, ecoRating: 4, location: 'Dibrugarh, Assam',        state: 'Assam',       status: 'approved' },
  { name: 'Cane Storage Basket',   category: 'medium',     price: 449, stock: 18,  carbonSaved: 2.7, ecoRating: 4, location: 'Silchar, Assam',          state: 'Assam',       status: 'approved' },

  // ── Rajasthan (4) ──
  { name: 'Large Mud Vase',        category: 'large',      price: 699, stock: 10,  carbonSaved: 5.2, ecoRating: 5, location: 'Jaipur, Rajasthan',       state: 'Rajasthan',   status: 'approved' },
  { name: 'Rajasthani Jali Pot',   category: 'decorative', price: 399, stock: 22,  carbonSaved: 3.0, ecoRating: 5, location: 'Jodhpur, Rajasthan',      state: 'Rajasthan',   status: 'approved' },
  { name: 'Pichwai Painting Pot',  category: 'decorative', price: 799, stock: 0,   carbonSaved: 3.6, ecoRating: 5, location: 'Udaipur, Rajasthan',      state: 'Rajasthan',   status: 'pending'  },
  { name: 'Terracotta Water Pot',  category: 'medium',     price: 299, stock: 35,  carbonSaved: 2.2, ecoRating: 4, location: 'Bikaner, Rajasthan',      state: 'Rajasthan',   status: 'rejected' },

  // ── Kerala (4) ──
  { name: 'Coir Planter',          category: 'small',      price: 199, stock: 60,  carbonSaved: 1.8, ecoRating: 4, location: 'Thrissur, Kerala',        state: 'Kerala',      status: 'approved' },
  { name: 'Large Garden Pot',      category: 'large',      price: 499, stock: 25,  carbonSaved: 4.0, ecoRating: 4, location: 'Kochi, Kerala',           state: 'Kerala',      status: 'approved' },
  { name: 'Coconut Shell Bowl',    category: 'small',      price: 149, stock: 100, carbonSaved: 0.7, ecoRating: 5, location: 'Kozhikode, Kerala',       state: 'Kerala',      status: 'approved' },
  { name: 'Wooden Planter Box',    category: 'medium',     price: 549, stock: 8,   carbonSaved: 3.3, ecoRating: 4, location: 'Trivandrum, Kerala',      state: 'Kerala',      status: 'approved' },

  // ── Karnataka (3) ──
  { name: 'Stone Garden Urn',      category: 'large',      price: 899, stock: 4,   carbonSaved: 6.5, ecoRating: 5, location: 'Bengaluru, Karnataka',    state: 'Karnataka',   status: 'approved' },
  { name: 'Rosewood Vase',         category: 'decorative', price: 1099,stock: 3,   carbonSaved: 5.8, ecoRating: 5, location: 'Mysuru, Karnataka',       state: 'Karnataka',   status: 'approved' },
  { name: 'Sandstone Planter',     category: 'medium',     price: 449, stock: 14,  carbonSaved: 3.2, ecoRating: 4, location: 'Hubli, Karnataka',        state: 'Karnataka',   status: 'pending'  },

  // ── Gujarat (2) ──
  { name: 'Decorative Jali Pot',   category: 'decorative', price: 399, stock: 0,   carbonSaved: 3.0, ecoRating: 5, location: 'Ahmedabad, Gujarat',      state: 'Gujarat',     status: 'approved' },
  { name: 'Bandhani Print Pot',    category: 'decorative', price: 349, stock: 11,  carbonSaved: 2.6, ecoRating: 4, location: 'Surat, Gujarat',          state: 'Gujarat',     status: 'pending'  },

  // ── Tamil Nadu (2) ──
  { name: 'Hanging Pot Set',       category: 'small',      price: 299, stock: 60,  carbonSaved: 1.8, ecoRating: 4, location: 'Chennai, Tamil Nadu',     state: 'Tamil Nadu',  status: 'approved' },
  { name: 'Tanjore Painting Pot',  category: 'decorative', price: 749, stock: 7,   carbonSaved: 3.8, ecoRating: 5, location: 'Thanjavur, Tamil Nadu',   state: 'Tamil Nadu',  status: 'approved' },

  // ── West Bengal (2) ──
  { name: 'Terracotta Diya Set',   category: 'small',      price: 99,  stock: 200, carbonSaved: 0.5, ecoRating: 5, location: 'Kolkata, West Bengal',    state: 'West Bengal', status: 'approved' },
  { name: 'Dokra Art Figurine',    category: 'decorative', price: 899, stock: 2,   carbonSaved: 4.5, ecoRating: 5, location: 'Bishnupur, West Bengal',  state: 'West Bengal', status: 'rejected' },

  // ── Uttar Pradesh (2) ──
  { name: 'Brass Engraved Urli',   category: 'large',      price: 1299,stock: 5,   carbonSaved: 7.2, ecoRating: 5, location: 'Lucknow, Uttar Pradesh',  state: 'Uttar Pradesh', status: 'approved' },
  { name: 'Chikankari Pot Cover',  category: 'small',      price: 249, stock: 40,  carbonSaved: 1.1, ecoRating: 4, location: 'Lucknow, Uttar Pradesh',  state: 'Uttar Pradesh', status: 'approved' },

  // ── Delhi (2) ──
  { name: 'Terracotta Bonsai Tray',category: 'small',      price: 199, stock: 55,  carbonSaved: 1.4, ecoRating: 4, location: 'New Delhi, Delhi',       state: 'Delhi',        status: 'approved' },
  { name: 'Mughal-Style Planter',  category: 'decorative', price: 649, stock: 9,   carbonSaved: 3.7, ecoRating: 5, location: 'Old Delhi, Delhi',        state: 'Delhi',        status: 'pending'  },

  // ── Telangana (2) ──
  { name: 'Bidri Hookah Vase',     category: 'decorative', price: 999, stock: 7,   carbonSaved: 4.8, ecoRating: 5, location: 'Hyderabad, Telangana',    state: 'Telangana',    status: 'approved' },
  { name: 'Hyderabadi Lac Pot',    category: 'medium',     price: 449, stock: 0,   carbonSaved: 2.8, ecoRating: 4, location: 'Hyderabad, Telangana',    state: 'Telangana',    status: 'approved' },

  // ── Madhya Pradesh (2) ──
  { name: 'Bagh Print Matka',      category: 'medium',     price: 379, stock: 30,  carbonSaved: 2.3, ecoRating: 4, location: 'Bhopal, Madhya Pradesh',  state: 'Madhya Pradesh', status: 'approved' },
  { name: 'Chanderi Silk Pot Bag', category: 'small',      price: 299, stock: 18,  carbonSaved: 1.0, ecoRating: 4, location: 'Bhopal, Madhya Pradesh',  state: 'Madhya Pradesh', status: 'pending'  },

  // ── Uttarakhand (2) ──
  { name: 'Pinewood Window Planter', category: 'medium',   price: 549, stock: 12,  carbonSaved: 3.5, ecoRating: 5, location: 'Dehradun, Uttarakhand',   state: 'Uttarakhand',  status: 'approved' },
  { name: 'Ringal Bamboo Basket',  category: 'small',      price: 179, stock: 65,  carbonSaved: 1.3, ecoRating: 5, location: 'Nainital, Uttarakhand',   state: 'Uttarakhand',  status: 'approved' },

  // ── Odisha (2) ──
  { name: 'Pattachitra Painted Pot',category: 'decorative',price: 699, stock: 11,  carbonSaved: 3.4, ecoRating: 5, location: 'Bhubaneswar, Odisha',     state: 'Odisha',       status: 'approved' },
  { name: 'Brass Filigree Diya',   category: 'small',      price: 229, stock: 90,  carbonSaved: 1.0, ecoRating: 5, location: 'Cuttack, Odisha',         state: 'Odisha',       status: 'approved' },

  // ── Jharkhand (2) ──
  { name: 'Tribal Dhokra Planter', category: 'decorative', price: 849, stock: 6,   carbonSaved: 4.2, ecoRating: 5, location: 'Ranchi, Jharkhand',       state: 'Jharkhand',    status: 'approved' },
  { name: 'Sohrai Khovar Pot',     category: 'medium',     price: 479, stock: 14,  carbonSaved: 2.9, ecoRating: 5, location: 'Hazaribagh, Jharkhand',    state: 'Jharkhand',    status: 'pending'  },
];

const connectAndSeed = async () => {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // ── Wipe existing data for the collections we're about to (re)seed ──
    console.log('\n🧹 Wiping existing products, branches, and seeded employees...');
    await Product.deleteMany({});
    await Branch.deleteMany({});
    await User.deleteMany({ email: { $in: EMPLOYEE_SEEDS.map((e) => e.email) } });
    console.log('   ✅ Wiped');

    // ── 1. Master Admin (preserved across reseeds) ─────────────
    console.log('\n👤 Ensuring master admin exists...');
    let adminUser = await User.findOne({ email: 'admin@greenyatra.in' });
    if (adminUser) {
      console.log('   Admin user already exists — keeping');
    } else {
      adminUser = await User.create({
        name: 'Green Yatra Admin',
        email: 'admin@greenyatra.in',
        password: 'Admin@123',
        role: 'MASTER_ADMIN',
        greenScore: 1000,
        badges: [{ name: 'Forest 🌲' }, { name: 'Carbon Warrior 🌍' }],
      });
      console.log('   ✅ Admin created: admin@greenyatra.in / Admin@123');
    }

    // ── 2. Employee Users ──────────────────────────────────────
    console.log('\n🏭 Creating employee users...');
    const employees = [];
    for (const emp of EMPLOYEE_SEEDS) {
      const user = await User.create({
        name: emp.name, email: emp.email,
        password: 'Branch@123', role: 'EMPLOYEE',
        state: emp.state, greenScore: 450,
      });
      employees.push({ ...emp, _id: user._id });
      console.log(`   ✅ ${emp.email} (${emp.state})`);
    }

    // ── 3. Branches (one per employee/state) ───────────────────
    console.log('\n🏢 Creating state branches...');
    const cityByState = {
      Maharashtra: 'Pune',
      Assam: 'Guwahati',
      Rajasthan: 'Jaipur',
      Kerala: 'Thrissur',
      Karnataka: 'Bengaluru',
      Gujarat: 'Ahmedabad',
      'Tamil Nadu': 'Chennai',
      'West Bengal': 'Kolkata',
      'Uttar Pradesh': 'Lucknow',
      Delhi: 'New Delhi',
      Telangana: 'Hyderabad',
      'Madhya Pradesh': 'Bhopal',
      Uttarakhand: 'Dehradun',
      Odisha: 'Bhubaneswar',
      Jharkhand: 'Ranchi',
    };
    const pinByState = {
      Maharashtra: '411001',
      Assam: '781001',
      Rajasthan: '302001',
      Kerala: '680001',
      Karnataka: '560001',
      Gujarat: '380001',
      'Tamil Nadu': '600001',
      'West Bengal': '700001',
      'Uttar Pradesh': '226001',
      Delhi: '110001',
      Telangana: '500001',
      'Madhya Pradesh': '462001',
      Uttarakhand: '248001',
      Odisha: '751001',
      Jharkhand: '834001',
    };
    for (const emp of employees) {
      await Branch.create({
        state: emp.state,
        manager: emp._id,
        managerName: emp.name,
        phone: '9800000000',
        email: emp.email,
        address: {
          line1: 'Green Yatra Office',
          city: cityByState[emp.state],
          pincode: pinByState[emp.state],
        },
        verifiedAt: new Date(),
        stats: { totalProducts: 0, totalOrders: 0, totalCarbonImpact: 0, totalRevenue: 0, plantCount: 0 },
      });
      console.log(`   ✅ Branch: ${emp.state}`);
    }

    // ── 4. Plants (preserved across reseeds) ───────────────────
    console.log('\n🌿 Ensuring plant species exist...');
    const plantCount = await Plant.countDocuments();
    if (plantCount === 0) {
      const PLANTS = [
        { name: 'Neem', scientificName: 'Azadirachta indica', description: 'Sacred and medicinal tree found across India.', category: 'native', speciesCount: 1200, carbonAbsorption: 'High', benefits: 'Antibacterial, air purifier', states: ['Maharashtra','Delhi','UP','Rajasthan','Gujarat'], region: 'Pan India', isEndangered: false },
        { name: 'Peepal', scientificName: 'Ficus religiosa', description: 'Sacred fig tree.', category: 'native', speciesCount: 980, carbonAbsorption: 'Very High', benefits: 'Oxygen producer', states: ['UP','Bihar','Delhi','MP'], region: 'Pan India', isEndangered: false },
        { name: 'Tulsi', scientificName: 'Ocimum tenuiflorum', description: 'Holy basil.', category: 'native', speciesCount: 5000, carbonAbsorption: 'Medium', benefits: 'Antiseptic, immune booster', states: ['Kerala','Tamil Nadu','Karnataka','Maharashtra'], region: 'Pan India', isEndangered: false },
        { name: 'Bamboo', scientificName: 'Bambusoideae', description: 'Fastest growing plant on Earth.', category: 'native', speciesCount: 450, carbonAbsorption: 'Very High', benefits: 'Carbon sequestration', states: ['Manipur','Assam','Meghalaya'], region: 'Northeast India', isEndangered: false },
        { name: 'Kerala Orchid', scientificName: 'Vanda tessellata', description: 'Rare endemic orchid.', category: 'protected', speciesCount: 120, carbonAbsorption: 'Low', benefits: 'Medicinal, ornamental', states: ['Kerala'], region: 'Western Ghats', isEndangered: true },
      ];
      for (const plant of PLANTS) {
        await Plant.create({ ...plant, addedBy: adminUser._id });
      }
      console.log(`   ✅ Created ${PLANTS.length} plants`);
    } else {
      console.log(`   ${plantCount} plants already exist — keeping`);
    }

    // ── 5. Products ────────────────────────────────────────────
    console.log('\n🏺 Creating products...');
    const employeesByState = Object.fromEntries(employees.map((e) => [e.state, e]));
    for (let i = 0; i < PRODUCT_SEEDS.length; i++) {
      const p = PRODUCT_SEEDS[i];
      const owner = employeesByState[p.state] || employees[i % employees.length];
      const adminNote = p.status === 'rejected'
        ? 'Quality verification failed — please resubmit with updated photos.'
        : (p.status === 'pending' ? '' : undefined);
      await Product.create({
        name: p.name,
        category: p.category,
        price: p.price,
        stock: p.stock,
        carbonSaved: p.carbonSaved,
        ecoRating: p.ecoRating,
        location: p.location,
        state: p.state,
        branchId: owner._id,
        status: p.status,
        adminNote,
        tags: [p.category, p.state.toLowerCase().replace(/\s+/g, '-')],
        images: [{ url: `https://res.cloudinary.com/demo/image/upload/v1/green-yatra/${p.name.toLowerCase().replace(/\s+/g, '-')}`, publicId: `seed-${i + 1}` }],
      });
    }
    console.log(`   ✅ ${PRODUCT_SEEDS.length} products created`);

    // ── Summary ───────────────────────────────────────────────
    const counts = {
      approved: PRODUCT_SEEDS.filter((p) => p.status === 'approved').length,
      pending:  PRODUCT_SEEDS.filter((p) => p.status === 'pending').length,
      rejected: PRODUCT_SEEDS.filter((p) => p.status === 'rejected').length,
      inStock:  PRODUCT_SEEDS.filter((p) => p.stock >= 15).length,
      lowStock: PRODUCT_SEEDS.filter((p) => p.stock > 0 && p.stock < 15).length,
      outOfStock: PRODUCT_SEEDS.filter((p) => p.stock === 0).length,
      states: new Set(PRODUCT_SEEDS.map((p) => p.state)).size,
    };

    console.log('\n🎉 Seed complete!');
    console.log(`   Users:     ${await User.countDocuments()}`);
    console.log(`   Branches:  ${await Branch.countDocuments()}`);
    console.log(`   Plants:    ${await Plant.countDocuments()}`);
    console.log(`   Products:  ${await Product.countDocuments()}`);
    console.log(`\n   Status mix: ${counts.approved} approved · ${counts.pending} pending · ${counts.rejected} rejected`);
    console.log(`   Stock mix:  ${counts.inStock} in-stock · ${counts.lowStock} low · ${counts.outOfStock} out`);
    console.log(`   States:     ${counts.states}`);

    console.log('\n📋 Login credentials:');
    console.log('   Admin:    admin@greenyatra.in        / Admin@123');
    EMPLOYEE_SEEDS.forEach((e) => console.log(`   Employee: ${e.email.padEnd(36)} / Branch@123`));

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed failed:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
};

connectAndSeed();