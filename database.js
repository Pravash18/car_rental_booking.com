const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'car_rental.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database:', DB_PATH);
});

// Enable WAL mode for better concurrency
db.run('PRAGMA journal_mode=WAL');
db.run('PRAGMA foreign_keys=ON');

// Create tables and seed data
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table (enhanced with both email and phone verification fields)
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          phone TEXT,
          role TEXT DEFAULT 'user',
          avatar TEXT,
          email_verified INTEGER DEFAULT 0,
          verification_otp TEXT,
          otp_expires_at DATETIME,
          phone_verified INTEGER DEFAULT 0,
          phone_otp TEXT,
          phone_otp_expires_at DATETIME,
          password_reset_otp TEXT,
          reset_otp_expires_at DATETIME,
          login_attempts INTEGER DEFAULT 0,
          locked_until DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => { if (err) console.error('Users table error:', err); });

      // Cars table
      db.run(`
        CREATE TABLE IF NOT EXISTS cars (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          brand TEXT NOT NULL,
          model TEXT NOT NULL,
          year INTEGER NOT NULL,
          category TEXT NOT NULL,
          price_per_day REAL NOT NULL,
          seats INTEGER NOT NULL,
          transmission TEXT NOT NULL,
          fuel_type TEXT NOT NULL,
          color TEXT NOT NULL,
          image_url TEXT,
          description TEXT,
          features TEXT,
          available INTEGER DEFAULT 1,
          rating REAL DEFAULT 4.5,
          total_reviews INTEGER DEFAULT 0,
          mileage INTEGER DEFAULT 0,
          horsepower INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => { if (err) console.error('Cars table error:', err); });

      // Bookings table
      db.run(`
        CREATE TABLE IF NOT EXISTS bookings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          car_id INTEGER NOT NULL,
          pickup_date TEXT NOT NULL,
          return_date TEXT NOT NULL,
          pickup_location TEXT NOT NULL,
          return_location TEXT NOT NULL,
          total_days INTEGER NOT NULL,
          total_price REAL NOT NULL,
          status TEXT DEFAULT 'pending',
          payment_status TEXT DEFAULT 'unpaid',
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE
        )
      `, (err) => { if (err) console.error('Bookings table error:', err); });

      // Payments table (enhanced for UPI and Card)
      db.run(`
        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          booking_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          razorpay_order_id TEXT,
          razorpay_payment_id TEXT,
          razorpay_signature TEXT,
          upi_transaction_id TEXT,
          amount REAL NOT NULL,
          currency TEXT DEFAULT 'INR',
          status TEXT DEFAULT 'created',
          method TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => { if (err) console.error('Payments table error:', err); });

      // Add columns if altering existing tables
      const newUserColumns = [
        { name: 'email_verified', type: 'INTEGER DEFAULT 0' },
        { name: 'verification_otp', type: 'TEXT' },
        { name: 'otp_expires_at', type: 'DATETIME' },
        { name: 'phone_verified', type: 'INTEGER DEFAULT 0' },
        { name: 'phone_otp', type: 'TEXT' },
        { name: 'phone_otp_expires_at', type: 'DATETIME' },
        { name: 'password_reset_otp', type: 'TEXT' },
        { name: 'reset_otp_expires_at', type: 'DATETIME' },
        { name: 'login_attempts', type: 'INTEGER DEFAULT 0' },
        { name: 'locked_until', type: 'DATETIME' },
      ];

      newUserColumns.forEach(col => {
        db.run(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`, (err) => {
          // Ignore duplicate column errors
        });
      });

      // Seed Indian cars data
      db.get('SELECT COUNT(*) as count FROM cars', async (err, row) => {
        if (err) { console.error(err); return; }
        if (row.count === 0) {
          const cars = [
            {
              name: 'Maruti Suzuki Swift',
              brand: 'Maruti Suzuki',
              model: 'Swift ZXi+',
              year: 2024,
              category: 'Hatchback',
              price_per_day: 1499,
              seats: 5,
              transmission: 'Manual',
              fuel_type: 'Petrol',
              color: 'Pearl Arctic White',
              image_url: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800',
              description: 'India\'s favourite hatchback. The all-new Swift delivers bold design, peppy performance, and outstanding fuel efficiency for city driving.',
              features: JSON.stringify(['Touchscreen Infotainment', 'Auto Headlamps', 'Cruise Control', 'Push Button Start', 'Dual Airbags', 'ABS with EBD']),
              rating: 4.5,
              total_reviews: 2340,
              horsepower: 90,
              mileage: 25
            },
            {
              name: 'Hyundai Creta',
              brand: 'Hyundai',
              model: 'Creta SX(O)',
              year: 2024,
              category: 'SUV',
              price_per_day: 2999,
              seats: 5,
              transmission: 'Automatic',
              fuel_type: 'Diesel',
              color: 'Abyss Black',
              image_url: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800',
              description: 'The SUV that redefined the segment in India. Premium interiors, connected features, and commanding road presence make the Creta a top choice.',
              features: JSON.stringify(['Panoramic Sunroof', 'Ventilated Seats', 'ADAS Level 2', '10.25" Touchscreen', 'Bose Premium Sound', '360° Camera']),
              rating: 4.7,
              total_reviews: 1856,
              horsepower: 158,
              mileage: 21
            },
            {
              name: 'Tata Nexon EV',
              brand: 'Tata',
              model: 'Nexon EV Max LR',
              year: 2024,
              category: 'Electric',
              price_per_day: 2499,
              seats: 5,
              transmission: 'Automatic',
              fuel_type: 'Electric',
              color: 'Fearless Purple',
              image_url: 'https://images.unsplash.com/photo-1619317666375-0cbb981b32b8?w=800',
              description: 'India\'s best-selling electric SUV. Zero emissions, instant torque, and a range of 437 km make it perfect for eco-conscious road warriors.',
              features: JSON.stringify(['40.5 kWh Battery', 'Fast Charging', 'Connected Car Tech', 'Ventilated Seats', 'Air Purifier', 'Wireless Charger']),
              rating: 4.6,
              total_reviews: 1420,
              horsepower: 143,
              mileage: 437
            },
            {
              name: 'Mahindra Thar',
              brand: 'Mahindra',
              model: 'Thar RWD',
              year: 2024,
              category: 'Adventure',
              price_per_day: 3499,
              seats: 4,
              transmission: 'Manual',
              fuel_type: 'Diesel',
              color: 'Napoli Black',
              image_url: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=800',
              description: 'Born for adventure. The Thar combines rugged off-road capability with modern comfort — perfect for Ladakh, Goa, and everything in between.',
              features: JSON.stringify(['4x4 Drivetrain', 'Convertible Roof', 'Touchscreen', 'Cruise Control', 'Drizzle Resistant IP', 'Roll Cage']),
              rating: 4.8,
              total_reviews: 980,
              horsepower: 150,
              mileage: 15
            },
            {
              name: 'Toyota Fortuner',
              brand: 'Toyota',
              model: 'Fortuner Legender',
              year: 2024,
              category: 'Premium',
              price_per_day: 5999,
              seats: 7,
              transmission: 'Automatic',
              fuel_type: 'Diesel',
              color: 'Phantom Brown',
              image_url: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800',
              description: 'The king of Indian SUVs. Toyota\'s legendary reliability meets muscular styling — the Fortuner Legender commands respect on every road.',
              features: JSON.stringify(['2.8L Diesel', '4x4 Option', 'JBL Sound System', 'Wireless Charging', '360° Camera', 'Kicksensor Tailgate']),
              rating: 4.9,
              total_reviews: 1120,
              horsepower: 204,
              mileage: 14
            },
            {
              name: 'Kia Seltos',
              brand: 'Kia',
              model: 'Seltos HTX+',
              year: 2024,
              category: 'Compact SUV',
              price_per_day: 2799,
              seats: 5,
              transmission: 'Automatic',
              fuel_type: 'Petrol',
              color: 'Gravity Grey',
              image_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800',
              description: 'Where style meets substance. The Seltos offers a premium driving experience with cutting-edge technology at a compelling value.',
              features: JSON.stringify(['10.25" HD Display', 'Bose Sound', 'Ventilated Seats', 'ADAS Suite', 'UVO Connect', '6 Airbags']),
              rating: 4.6,
              total_reviews: 1650,
              horsepower: 140,
              mileage: 18
            },
            {
              name: 'MG Hector',
              brand: 'MG',
              model: 'Hector Sharp Pro',
              year: 2024,
              category: 'SUV',
              price_per_day: 3299,
              seats: 5,
              transmission: 'Automatic',
              fuel_type: 'Hybrid',
              color: 'Starry Black',
              image_url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800',
              description: 'India\'s internet car. The Hector brings the biggest cabin in its class with connected car features that feel futuristic.',
              features: JSON.stringify(['14" Touchscreen', 'i-Smart Connected', 'Panoramic Sunroof', '48V Mild Hybrid', 'Infinity Audio', 'ADAS']),
              rating: 4.5,
              total_reviews: 890,
              horsepower: 170,
              mileage: 16
            },
            {
              name: 'Tata Harrier',
              brand: 'Tata',
              model: 'Harrier Fearless+',
              year: 2024,
              category: 'SUV',
              price_per_day: 3599,
              seats: 5,
              transmission: 'Automatic',
              fuel_type: 'Diesel',
              color: 'Daytona Grey',
              image_url: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800',
              description: 'Reclaim your life. The Harrier rides on Land Rover-derived OMEGARC platform, delivering a commanding presence and planted ride quality.',
              features: JSON.stringify(['Fiat 2.0L Diesel', 'OMEGARC Platform', 'JBL Sound', 'Panoramic Sunroof', 'ADAS', 'Air Purifier']),
              rating: 4.7,
              total_reviews: 1050,
              horsepower: 170,
              mileage: 16
            },
            {
              name: 'Honda City',
              brand: 'Honda',
              model: 'City ZX CVT',
              year: 2024,
              category: 'Sedan',
              price_per_day: 2299,
              seats: 5,
              transmission: 'Automatic',
              fuel_type: 'Petrol',
              color: 'Platinum White Pearl',
              image_url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800',
              description: 'India\'s most trusted sedan. The City combines refinement, space, and Honda\'s legendary reliability for the discerning Indian buyer.',
              features: JSON.stringify(['Honda Sensing', 'Lane Watch Camera', 'Sunroof', '8" Touchscreen', 'Alexa Built-in', '6 Airbags']),
              rating: 4.7,
              total_reviews: 2100,
              horsepower: 121,
              mileage: 22
            },
            {
              name: 'Hyundai Venue',
              brand: 'Hyundai',
              model: 'Venue SX+ DCT',
              year: 2024,
              category: 'Compact SUV',
              price_per_day: 1999,
              seats: 5,
              transmission: 'Automatic',
              fuel_type: 'Petrol',
              color: 'Denim Blue',
              image_url: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800',
              description: 'The smart-sized SUV for smart cities. Perfect blend of compact dimensions, punchy performance, and connected tech for urban India.',
              features: JSON.stringify(['BlueLink Connected', '8" Touchscreen', 'Sunroof', 'Wireless Charging', 'Air Purifier', 'Digital Key']),
              rating: 4.4,
              total_reviews: 1780,
              horsepower: 120,
              mileage: 18
            },
            {
              name: 'Mahindra XUV700',
              brand: 'Mahindra',
              model: 'XUV700 AX7 L',
              year: 2024,
              category: 'Premium',
              price_per_day: 4499,
              seats: 7,
              transmission: 'Automatic',
              fuel_type: 'Diesel',
              color: 'Midnight Black',
              image_url: 'https://images.unsplash.com/photo-1536700503339-1e4b06520771?w=800',
              description: 'Sophisticated technology meets bold design. The XUV700 packs ADAS, dual screens, and a massive road presence — India\'s smartest SUV.',
              features: JSON.stringify(['Dual 10.25" Screens', 'ADAS Level 2', 'Sony 3D Sound', 'Flush Door Handles', 'Skyroof', 'eBooster Technology']),
              rating: 4.8,
              total_reviews: 1340,
              horsepower: 185,
              mileage: 16
            },
            {
              name: 'Lamborghini Huracán EVO',
              brand: 'Lamborghini',
              model: 'Huracán EVO',
              year: 2024,
              category: 'Supercar',
              price_per_day: 75000,
              seats: 2,
              transmission: 'Automatic',
              fuel_type: 'Petrol',
              color: 'Arancio Borealis',
              image_url: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800',
              description: 'The pinnacle of Italian engineering now available in India. V10 naturally aspirated, 640 HP of pure supercar experience. Drive it on Bengaluru\'s Outer Ring Road or Mumbai\'s Marine Drive.',
              features: JSON.stringify(['V10 Engine', 'All-Wheel Drive', 'Magnetic Suspension', 'Launch Control', 'Carbon Fiber Interior', 'Track Mode']),
              rating: 5.0,
              total_reviews: 42,
              horsepower: 640,
              mileage: 8
            },
            {
              name: 'Maruti Suzuki Grand Vitara',
              brand: 'Maruti Suzuki',
              model: 'Grand Vitara Alpha+ Hybrid',
              year: 2024,
              category: 'SUV',
              price_per_day: 2499,
              seats: 5,
              transmission: 'Automatic',
              fuel_type: 'Hybrid',
              color: 'Nexa Blue',
              image_url: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=800',
              description: 'Experience Maruti\'s intelligent Electric Hybrid SUV. Incredible efficiency of 27.97 km/l, panoramic sunroof, and Suzuki Connect connectivity.',
              features: JSON.stringify(['Mild Hybrid Tech', 'Panoramic Sunroof', 'Ventilated Seats', '360° View Camera', 'Head-Up Display', '6 Airbags']),
              rating: 4.6,
              total_reviews: 432,
              horsepower: 114,
              mileage: 27
            },
            {
              name: 'Honda Amaze',
              brand: 'Honda',
              model: 'Amaze VX CVT',
              year: 2024,
              category: 'Sedan',
              price_per_day: 1299,
              seats: 5,
              transmission: 'Automatic',
              fuel_type: 'Petrol',
              color: 'Radiant Red Metallic',
              image_url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800',
              description: 'The premium family sedan. Exceptional cabin space, absolute ride comfort, and Honda\'s i-VTEC petrol motor with smooth CVT.',
              features: JSON.stringify(['i-VTEC Engine', 'CVT Transmission', 'Digipad 2.0 Touchscreen', 'LED Projector Lights', 'Rear Camera', 'Engine Start Button']),
              rating: 4.4,
              total_reviews: 782,
              horsepower: 89,
              mileage: 18
            },
            {
              name: 'Maruti Suzuki Brezza',
              brand: 'Maruti Suzuki',
              model: 'Brezza ZXi+ AT',
              year: 2024,
              category: 'Compact SUV',
              price_per_day: 1799,
              seats: 5,
              transmission: 'Automatic',
              fuel_type: 'Petrol',
              color: 'Splendid Silver',
              image_url: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800',
              description: 'The techy city compact SUV. Smartplay Pro+, electric sunroof, head-up display, and mild hybrid performance for convenient driving.',
              features: JSON.stringify(['Electric Sunroof', 'SmartPlay Pro+ Touchscreen', 'Head-Up Display', '360° Camera', 'Arkamys Sound System', 'Paddle Shifters']),
              rating: 4.5,
              total_reviews: 940,
              horsepower: 102,
              mileage: 19
            }
          ];

          const stmt = db.prepare(`
            INSERT INTO cars (name, brand, model, year, category, price_per_day, seats, 
            transmission, fuel_type, color, image_url, description, features, rating, 
            total_reviews, horsepower, mileage)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          cars.forEach(car => {
            stmt.run([
              car.name, car.brand, car.model, car.year, car.category,
              car.price_per_day, car.seats, car.transmission, car.fuel_type,
              car.color, car.image_url, car.description, car.features,
              car.rating, car.total_reviews, car.horsepower, car.mileage
            ]);
          });

          stmt.finalize((err) => {
            if (!err) console.log(`✅ Indian cars seeded successfully (${cars.length} vehicles)`);
          });
        }

        // Seed admin user
        db.get('SELECT COUNT(*) as count FROM users', async (err, row) => {
          if (err) { console.error(err); return; }
          if (row.count === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 12);
            db.run(
              'INSERT INTO users (name, email, password, role, phone, email_verified, phone_verified) VALUES (?, ?, ?, ?, ?, ?, ?)',
              ['Admin User', 'admin@carrental.com', hashedPassword, 'admin', '+91-9876543210', 1, 1],
              (err) => {
                if (!err) console.log('✅ Admin user seeded: admin@carrental.com / admin123');
              }
            );
          }

          resolve(db);
        });
      });
    });
  });
}

module.exports = { db, initializeDatabase };
