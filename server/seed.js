import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Customer from './models/Customer.js';
import Order from './models/Order.js';
import Payment from './models/Payment.js';

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany(),
      Customer.deleteMany(),
      Order.deleteMany(),
      Payment.deleteMany(),
    ]);
    console.log('🗑️  Cleared existing data');

    // Create admin user for chapaimango.bd
    const admin = await User.create({
      name: 'Chapai Mango Admin',
      email: 'admin@chapaimango.bd',
      phone: '01722883710',
      password: 'admin123',
      role: 'admin',
    });
    console.log('👤 Admin created: admin@chapaimango.bd (Phone: 01722883710) / admin123');

    // Create customers across Bangladesh with opening balances
    const customersData = [
      { name: 'Rahim Uddin', phone: '01711111111', address: 'House 14, Road 5, Gulshan-1, Dhaka', area: 'Dhaka', openingBalance: 4800 },
      { name: 'Karim Ahmed', phone: '01722222222', address: 'Plot 8, Agrabad C/A, Chittagong', area: 'Chittagong', openingBalance: 2400 },
      { name: 'Fatema Begum', phone: '01733333333', address: 'Block C, Road 11, Banani, Dhaka', area: 'Dhaka', openingBalance: 0 },
      { name: 'Jamal Hossain', phone: '01744444444', address: 'VIP Road, Sylhet Sadar, Sylhet', area: 'Sylhet', openingBalance: 6500 },
      { name: 'Nasrin Akter', phone: '01755555555', address: 'Road 27, Dhanmondi, Dhaka', area: 'Dhaka', openingBalance: 1300 },
      { name: 'Abul Kalam', phone: '01766666666', address: 'Boyra Main Road, Khulna City', area: 'Khulna', openingBalance: 0 },
      { name: 'Sufia Khatun', phone: '01777777777', address: 'Sector 7, Uttara, Dhaka', area: 'Dhaka', openingBalance: 9600 },
      { name: 'Mizanur Rahman', phone: '01788888888', address: 'Kazihata, Rajshahi City', area: 'Rajshahi', openingBalance: 2200 },
    ];

    const customers = await Customer.create(customersData);
    console.log(`👥 Created ${customers.length} customers`);

    // Create authentic Chapai Mango varieties & crates
    const products = [
      { name: 'Khirsapat (Himsagar) - 20 Kg Crate', rate: 2400 },
      { name: 'Langra (Premium Sweet) - 20 Kg Crate', rate: 2200 },
      { name: 'Amrapali (Original) - 10 Kg Box', rate: 1300 },
      { name: 'Gopalbhog (First Harvest) - 20 Kg Crate', rate: 2600 },
      { name: 'Fazli (Large Giant) - 25 Kg Crate', rate: 2000 },
      { name: 'Haribhanga (Rangpur Origin) - 10 Kg Box', rate: 1200 },
      { name: 'Surma Fazli (Export Grade) - 20 Kg Crate', rate: 2100 },
    ];

    const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    const couriers = ['Sundarban Courier', 'Steadfast', 'SA Paribahan', 'Pathao Courier', 'Korotoa'];

    for (let i = 0; i < 20; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const numItems = Math.floor(Math.random() * 2) + 1;
      const items = [];

      for (let j = 0; j < numItems; j++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const qty = Math.floor(Math.random() * 2) + 1;
        items.push({
          productName: product.name,
          quantity: qty,
          rate: product.rate,
          subtotal: qty * product.rate,
        });
      }

      const itemsTotal = items.reduce((s, item) => s + item.subtotal, 0);
      const discount = Math.random() > 0.7 ? Math.floor(Math.random() * 200) : 0;
      const courierCharge = Math.random() > 0.3 ? 150 : 0;
      const totalBill = itemsTotal - discount + courierCharge;
      const paidAmount = Math.random() > 0.4 ? Math.floor(totalBill * (Math.random() * 0.8 + 0.2)) : 0;
      const orderDue = totalBill - paidAmount;
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      // Create order
      const order = await Order.create({
        customer: customer._id,
        orderDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
        items,
        discount,
        totalBill,
        paidAmount,
        orderDue,
        courierName: couriers[Math.floor(Math.random() * couriers.length)],
        courierCharge,
        deliveryAddress: customer.address,
        notes: 'খাঁটি চাঁপাইনবাবগঞ্জের বাগান থেকে তাজা পাকা আম। ক্যারেট প্যাকিং।',
        status,
        paymentStatus: paidAmount <= 0 ? 'unpaid' : paidAmount >= totalBill ? 'paid' : 'partial',
      });

      // Update customer balance atomically
      await Customer.findByIdAndUpdate(customer._id, {
        $inc: {
          totalPurchases: totalBill,
          totalPaid: paidAmount,
          totalDue: orderDue,
          orderCount: 1,
        },
      });

      // Create payment record if paid
      if (paidAmount > 0) {
        await Payment.create({
          customer: customer._id,
          order: order._id,
          amount: paidAmount,
          method: ['cash', 'bkash', 'nagad'][Math.floor(Math.random() * 3)],
          note: 'Advance bKash/Nagad booking payment',
        });
      }
    }

    console.log('📦 Created 20 sample mango orders with payments');
    console.log('\n✨ Seed complete! You can now login with:');
    console.log('   Email / Phone: admin@chapaimango.bd or 01722883710');
    console.log('   Password: admin123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seed();
