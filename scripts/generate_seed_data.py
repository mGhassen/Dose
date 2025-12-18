#!/usr/bin/env python3
"""
Generate comprehensive seed data for Dose - Coffee Shop Edition
This script generates SQL INSERT statements for all tables with coffee shop-specific data
"""

import datetime
from decimal import Decimal

def generate_vendors():
    """Generate 30+ vendor records for coffee shop"""
    vendors = []
    vendor_id = 1
    
    vendor_names = [
        ('Premium Coffee Roasters', 'orders@premiumcoffee.com', '+1 (555) 100-0001', '123 Coffee Bean Ave, Seattle, WA 98101', 'John Coffee', 'Primary coffee bean supplier'),
        ('Milk & Dairy Distributor', 'sales@milkdist.com', '+1 (555) 100-0002', '456 Dairy Lane, Portland, OR 97201', 'Sarah Milk', 'Fresh milk and dairy products'),
        ('Pastry Supplier Co.', 'orders@pastryco.com', '+1 (555) 100-0003', '789 Bakery St, San Francisco, CA 94102', 'Mike Baker', 'Fresh pastries and baked goods'),
        ('Equipment Solutions', 'info@equipment.com', '+1 (555) 100-0004', '321 Machine Blvd, Los Angeles, CA 90001', 'Emily Tech', 'Coffee machines and equipment'),
        ('Cleaning Services Pro', 'contact@cleaning.com', '+1 (555) 100-0005', '654 Clean Way, Chicago, IL 60601', 'Robert Clean', 'Professional cleaning services'),
        ('Marketing Agency', 'hello@marketing.com', '+1 (555) 100-0006', '987 Ad Ave, New York, NY 10001', 'Lisa Market', 'Digital marketing and social media'),
        ('Insurance Provider', 'info@insurance.com', '+1 (555) 100-0007', '147 Policy St, Boston, MA 02101', 'David Insure', 'Business insurance'),
        ('Utilities Company', 'service@utilities.com', '+1 (555) 100-0008', '258 Power Rd, Miami, FL 33101', 'Jennifer Power', 'Electricity and water'),
        ('Internet Provider', 'support@internet.com', '+1 (555) 100-0009', '369 Web Blvd, Austin, TX 78701', 'Michael Net', 'Internet and phone services'),
        ('Legal Services', 'contact@legal.com', '+1 (555) 100-0010', '741 Law St, Denver, CO 80201', 'James Law', 'Legal consultation'),
    ]
    
    for name, email, phone, address, contact, notes in vendor_names:
        vendors.append(f"({vendor_id}, '{name}', '{email}', '{phone}', '{address}', '{contact}', '{notes}', true)")
        vendor_id += 1
    
    # Generate more vendors
    vendor_types = ['Supplier', 'Service Provider', 'Distributor']
    cities = ['Seattle', 'Portland', 'San Francisco', 'Los Angeles', 'Chicago', 'New York', 'Boston', 'Miami', 'Austin', 'Denver']
    
    for i in range(vendor_id, 31):
        vendor_type = vendor_types[i % len(vendor_types)]
        city = cities[i % len(cities)]
        name = f"{vendor_type} {i}"
        email = f"contact@{name.lower().replace(' ', '')}.com"
        phone = f"+1 (555) {100 + i:03d}-{2000 + i:04d}"
        address = f"{100 + i} {vendor_type} St, {city}, {['WA', 'OR', 'CA', 'CA', 'IL', 'NY', 'MA', 'FL', 'TX', 'CO'][i % 10]} {10000 + i}"
        contact = f"Contact Person {i}"
        notes = f"Auto-generated vendor {i}"
        
        vendors.append(f"({i}, '{name}', '{email}', '{phone}', '{address}', '{contact}', '{notes}', true)")
    
    return vendors

def generate_items():
    """Generate 50+ item records for coffee shop"""
    items = []
    item_id = 1
    
    base_items = [
        ('Premium Arabica Beans', 'High-quality arabica coffee beans from Colombia', 'Coffee', 'COFFEE-ARAB-001', 'kg', 28.50, 1, 'Best seller - premium quality'),
        ('Robusta Beans', 'Strong robusta coffee beans', 'Coffee', 'COFFEE-ROB-001', 'kg', 22.00, 1, 'For espresso blends'),
        ('Organic Milk', 'Fresh organic whole milk', 'Dairy', 'MILK-ORG-001', 'liter', 4.50, 2, 'Premium option'),
        ('Regular Milk', 'Standard whole milk', 'Dairy', 'MILK-REG-001', 'liter', 3.20, 2, 'Standard option'),
        ('Oat Milk', 'Plant-based oat milk', 'Dairy', 'MILK-OAT-001', 'liter', 5.50, 2, 'Vegan option'),
        ('Almond Milk', 'Plant-based almond milk', 'Dairy', 'MILK-ALM-001', 'liter', 6.00, 2, 'Vegan option'),
        ('Croissants', 'Fresh butter croissants', 'Pastry', 'PASTRY-CRO-001', 'piece', 2.50, 3, 'Daily delivery'),
        ('Muffins', 'Assorted muffins', 'Pastry', 'PASTRY-MUF-001', 'piece', 3.00, 3, 'Daily delivery'),
        ('Bagels', 'Fresh bagels', 'Pastry', 'PASTRY-BAG-001', 'piece', 2.00, 3, 'Daily delivery'),
        ('Espresso Machine', 'Commercial espresso machine', 'Equipment', 'EQUIP-ESP-001', 'unit', 8500.00, 4, 'Main equipment'),
        ('Grinder', 'Commercial coffee grinder', 'Equipment', 'EQUIP-GRIND-001', 'unit', 1200.00, 4, 'Coffee grinder'),
        ('Refrigerator', 'Commercial refrigerator', 'Equipment', 'EQUIP-FRIDGE-001', 'unit', 3500.00, 4, 'Storage'),
        ('Paper Cups', 'Disposable coffee cups', 'Supplies', 'SUPPLY-CUP-001', 'box', 25.00, 1, '500 cups per box'),
        ('Lids', 'Cup lids', 'Supplies', 'SUPPLY-LID-001', 'box', 12.00, 1, '500 lids per box'),
        ('Napkins', 'Paper napkins', 'Supplies', 'SUPPLY-NAP-001', 'pack', 8.00, 1, '1000 napkins per pack'),
        ('Sugar Packets', 'Sugar packets', 'Supplies', 'SUPPLY-SUG-001', 'box', 15.00, 1, '1000 packets per box'),
        ('Syrup - Vanilla', 'Vanilla syrup', 'Supplies', 'SUPPLY-SYR-VAN-001', 'bottle', 12.00, 1, '750ml bottle'),
        ('Syrup - Caramel', 'Caramel syrup', 'Supplies', 'SUPPLY-SYR-CAR-001', 'bottle', 12.00, 1, '750ml bottle'),
        ('Syrup - Hazelnut', 'Hazelnut syrup', 'Supplies', 'SUPPLY-SYR-HAZ-001', 'bottle', 12.00, 1, '750ml bottle'),
        ('Cleaning Supplies', 'General cleaning supplies', 'Supplies', 'SUPPLY-CLEAN-001', 'set', 45.00, 5, 'Monthly restock'),
    ]
    
    for name, desc, category, sku, unit, price, vendor_id, notes in base_items:
        items.append(f"({item_id}, '{name}', '{desc}', '{category}', '{sku}', '{unit}', {price:.2f}, {vendor_id}, '{notes}', true)")
        item_id += 1
    
    # Generate more items
    categories = ['Coffee', 'Dairy', 'Pastry', 'Equipment', 'Supplies', 'Food']
    units = ['piece', 'kg', 'liter', 'box', 'bottle', 'pack', 'set']
    
    for i in range(item_id, 51):
        category = categories[i % len(categories)]
        unit = units[i % len(units)]
        name = f"Item {i}"
        sku = f"ITEM-{i:03d}"
        price = 5.00 + (i * 2)
        vendor_id = (i % 30) + 1  # Reference to vendors 1-30
        desc = f"Description for {name}"
        notes = f"Auto-generated item {i}"
        
        items.append(f"({i}, '{name}', '{desc}', '{category}', '{sku}', '{unit}', {price:.2f}, {vendor_id}, '{notes}', true)")
    
    return items

def generate_subscriptions():
    """Generate subscriptions for coffee shop"""
    subscriptions = []
    sub_id = 1
    
    categories = {
        'rent': [
            ('Rent - Main Location', 4500.00, 'monthly', '2024-01-01'),
            ('Rent - Storage Unit', 300.00, 'monthly', '2024-01-01'),
        ],
        'utilities': [
            ('Electricity', 650.00, 'monthly', '2024-01-01'),
            ('Water', 180.00, 'monthly', '2024-01-01'),
            ('Internet & Phone', 120.00, 'monthly', '2024-01-01'),
            ('Gas', 250.00, 'monthly', '2024-01-01'),
            ('Waste Management', 80.00, 'monthly', '2024-01-01'),
        ],
        'supplies': [
            ('Coffee Beans - Monthly', 2800.00, 'monthly', '2024-01-01'),
            ('Milk & Dairy - Weekly', 600.00, 'monthly', '2024-01-01'),
            ('Pastries - Daily', 1200.00, 'monthly', '2024-01-01'),
            ('Paper Products', 180.00, 'monthly', '2024-01-01'),
            ('Cleaning Supplies', 150.00, 'monthly', '2024-01-01'),
        ],
        'marketing': [
            ('Social Media Marketing', 500.00, 'monthly', '2024-01-01'),
            ('Local Advertising', 300.00, 'monthly', '2024-02-01'),
        ],
        'insurance': [
            ('Business Insurance', 350.00, 'monthly', '2024-01-01'),
            ('Equipment Insurance', 120.00, 'monthly', '2024-01-01'),
        ],
        'maintenance': [
            ('Equipment Maintenance', 200.00, 'monthly', '2024-01-01'),
            ('Cleaning Service', 400.00, 'monthly', '2024-01-01'),
        ],
        'professional_services': [
            ('Accounting Services', 600.00, 'monthly', '2024-01-01'),
            ('Legal Services', 200.00, 'quarterly', '2024-01-01'),
        ],
    }
    
    for category, items in categories.items():
        for name, amount, recurrence, start_date in items:
            vendor_id = (sub_id % 30) + 1
            subscriptions.append(f"({sub_id}, '{name}', '{category}', {amount:.2f}, '{recurrence}', '{start_date}', NULL, '{name} subscription', 'Vendor {vendor_id}', true)")
            sub_id += 1
    
    return subscriptions

def generate_expenses_for_subscriptions(subscriptions_data, months=24):
    """Generate expense payments for subscriptions"""
    expenses = []
    expense_id = 1
    
    # One-time expenses
    one_time = [
        ('Initial Setup Cost', 'other', 5000.00, '2024-01-05'),
        ('Signage Installation', 'other', 1800.00, '2024-01-10'),
        ('Initial Marketing Campaign', 'marketing', 3000.00, '2024-01-15'),
        ('Equipment Purchase', 'other', 15000.00, '2024-02-01'),
        ('Renovation Costs', 'other', 12000.00, '2024-01-20'),
    ]
    
    for name, category, amount, date in one_time:
        expenses.append(f"({expense_id}, '{name}', '{category}', {amount:.2f}, 'one_time', '{date}', '{date}', '{name} expense', 'Vendor', NULL)")
        expense_id += 1
    
    # Generate monthly payments for subscriptions
    start_date = datetime.date(2024, 1, 1)
    for month_offset in range(months):
        current_date = start_date + datetime.timedelta(days=30 * month_offset)
        year = current_date.year
        month = current_date.month
        
        for sub_id, amount, recurrence, start_date_str in subscriptions_data:
            sub_start = datetime.datetime.strptime(start_date_str, '%Y-%m-%d').date()
            if current_date < sub_start:
                continue
            
            # Check if subscription should be paid this month based on recurrence
            months_since_start = (current_date.year - sub_start.year) * 12 + (current_date.month - sub_start.month)
            
            should_pay = False
            if recurrence == 'monthly' and months_since_start >= 0:
                should_pay = True
            elif recurrence == 'quarterly' and months_since_start >= 0 and months_since_start % 3 == 0:
                should_pay = True
            elif recurrence == 'yearly' and months_since_start >= 0 and months_since_start % 12 == 0:
                should_pay = True
            
            if should_pay:
                payment_day = 1 + (sub_id % 28)
                payment_date = f"{year}-{month:02d}-{payment_day:02d}"
                expenses.append(f"({expense_id}, 'Payment - Sub {sub_id} - {year}-{month:02d}', 'rent', {amount:.2f}, 'one_time', '{payment_date}', '{payment_date}', 'Payment for subscription {sub_id}', 'Vendor {sub_id}', {sub_id})")
                expense_id += 1
    
    return expenses, expense_id

def generate_leasing_payments():
    """Generate leasing payments for coffee shop"""
    leases = []
    lease_id = 1
    
    base_leases = [
        ('Espresso Machine Lease', 'finance', 450.00, '2024-01-01', '2027-12-31', 'monthly'),
        ('Delivery Vehicle Lease', 'operating', 650.00, '2024-02-01', '2027-01-31', 'monthly'),
        ('Refrigeration Unit Lease', 'finance', 280.00, '2024-01-01', '2027-12-31', 'monthly'),
    ]
    
    for name, lease_type, amount, start_date, end_date, frequency in base_leases:
        leases.append(f"({lease_id}, '{name}', '{lease_type}', {amount:.2f}, '{start_date}', '{end_date}', '{frequency}', '{name} lease', 'Lessor {lease_id}', true)")
        lease_id += 1
    
    return leases

def generate_loans():
    """Generate loans for coffee shop"""
    loans_sql = []
    loans_data = []
    loan_id = 1
    
    base_loans = [
        ('Coffee Shop Startup Loan', 'LOAN-001', 40000.00, 6.5, 60, '2024-01-01', 'active'),
        ('Equipment Financing', 'LOAN-002', 25000.00, 5.5, 36, '2024-02-01', 'active'),
    ]
    
    for name, loan_num, principal, rate, duration, start_date, status in base_loans:
        loans_sql.append(f"({loan_id}, '{name}', '{loan_num}', {principal:.2f}, {rate:.2f}, {duration}, '{start_date}', '{status}', 'Bank {loan_id}', '{name} description')")
        loans_data.append((loan_id, principal, rate, duration, start_date))
        loan_id += 1
    
    return loans_sql, loans_data

def generate_loan_schedules(loans_data):
    """Generate loan schedules"""
    schedules = []
    schedule_id = 1
    
    for loan_id, principal, rate, duration, start_date_str in loans_data:
        monthly_rate = rate / 100 / 12
        if monthly_rate > 0:
            monthly_payment = principal * (monthly_rate * (1 + monthly_rate)**duration) / ((1 + monthly_rate)**duration - 1)
        else:
            monthly_payment = principal / duration
        
        remaining_balance = principal
        start = datetime.datetime.strptime(start_date_str, '%Y-%m-%d').date()
        
        for month in range(1, min(duration + 1, 25)):  # Up to 24 months
            payment_date = start + datetime.timedelta(days=30 * (month - 1))
            interest_payment = remaining_balance * monthly_rate
            principal_payment = monthly_payment - interest_payment
            remaining_balance -= principal_payment
            
            is_paid = month <= 12  # First 12 months paid
            paid_date = f"'{payment_date}'" if is_paid else "NULL"
            
            schedules.append(f"({schedule_id}, {loan_id}, {month}, '{payment_date}', {principal_payment:.2f}, {interest_payment:.2f}, {monthly_payment:.2f}, {max(remaining_balance, 0):.2f}, {str(is_paid).lower()}, {paid_date})")
            schedule_id += 1
    
    return schedules

def generate_personnel():
    """Generate personnel for coffee shop"""
    personnel = []
    person_id = 1
    
    positions = [
        ('Barista', 1400.00, 'full_time'),
        ('Senior Barista', 1600.00, 'full_time'),
        ('Shift Manager', 2000.00, 'full_time'),
        ('Store Manager', 2800.00, 'full_time'),
        ('Cashier', 1200.00, 'part_time'),
        ('Kitchen Assistant', 1100.00, 'part_time'),
        ('Delivery Driver', 1300.00, 'part_time'),
        ('Cleaning Staff', 1000.00, 'part_time'),
    ]
    
    first_names = ['Ahmed', 'Fatima', 'Mohamed', 'Salma', 'Youssef', 'Amira', 'Karim', 'Leila', 'Hassan', 'Nour', 'Omar', 'Ines', 'Mehdi', 'Sana', 'Tarek']
    last_names = ['Ben Ali', 'Trabelsi', 'Jebali', 'Khelifi', 'Mansouri', 'Bouazizi', 'Hamdi', 'Slimani', 'Mezghani', 'Ben Ammar', 'Chaabane', 'Ghanmi', 'Bouslama', 'Fadhel', 'Khelil']
    
    for i, (position, base_salary, emp_type) in enumerate(positions):
        for j in range(3):  # 3 of each position
            first = first_names[(i * 3 + j) % len(first_names)]
            last = last_names[(i * 3 + j) % len(last_names)]
            email = f"{first.lower()}.{last.lower().replace(' ', '')}@coffeeshop.com"
            
            employer_charges = base_salary * 0.1875 if emp_type != 'contractor' else 0
            charges_type = 'percentage' if emp_type != 'contractor' else 'fixed'
            
            start_month = (i * 3 + j) % 12 + 1
            start_date = f"2024-{start_month:02d}-01"
            
            personnel.append(f"({person_id}, '{first}', '{last}', '{email}', '{position}', '{emp_type}', {base_salary:.2f}, {employer_charges:.2f}, '{charges_type}', '{start_date}', NULL, true, NULL)")
            person_id += 1
    
    return personnel

def generate_sales(start_year=2024, end_year=2025, months=24):
    """Generate sales data for coffee shop - 2 years, small company (fewer entries)"""
    sales = []
    sale_id = 1
    
    sales_types = ['on_site', 'delivery', 'takeaway']
    base_amounts = {'on_site': 850, 'delivery': 550, 'takeaway': 320}
    
    current_date = datetime.date(start_year, 1, 1)
    end_date = datetime.date(end_year, 12, 31)
    
    while current_date <= end_date:
        # Coffee shops are busier on weekdays and weekends
        is_weekend = current_date.weekday() >= 5
        is_holiday = current_date.month == 12 and current_date.day >= 20  # Holiday season
        
        # Generate 3-8 sales per day (realistic for small coffee shop)
        num_sales = 5 if is_weekend else 7
        if is_holiday:
            num_sales = int(num_sales * 1.3)
        
        for _ in range(num_sales):
            sale_type = sales_types[sale_id % len(sales_types)]
            base_amount = base_amounts[sale_type]
            
            # Add variation
            amount = base_amount + (sale_id % 400) - 200
            quantity = 1 + (sale_id % 3)  # 1-3 items per sale
            
            description = None
            if is_weekend:
                amount *= 1.15
                description = 'Weekend sale'
            elif is_holiday:
                amount *= 1.25
                description = 'Holiday special'
            elif sale_id % 50 == 0:
                description = 'Special promotion'
            
            desc_str = f"'{description}'" if description else 'NULL'
            sales.append(f"({sale_id}, '{current_date}', '{sale_type}', {amount:.2f}, {quantity}, {desc_str})")
            sale_id += 1
        
        current_date += datetime.timedelta(days=1)
    
    return sales

def generate_investments():
    """Generate investments for coffee shop"""
    investments_sql = []
    investments_data = []
    inv_id = 1
    
    base_investments = [
        ('Commercial Espresso Machine', 'equipment', 8500.00, '2024-01-01', 60, 'straight_line', 850.00),
        ('Coffee Grinder', 'equipment', 1200.00, '2024-01-01', 48, 'straight_line', 120.00),
        ('Refrigeration System', 'equipment', 3500.00, '2024-01-01', 84, 'straight_line', 350.00),
        ('POS System', 'technology', 3000.00, '2024-01-01', 36, 'straight_line', 300.00),
        ('Store Renovation', 'renovation', 18000.00, '2024-01-15', 120, 'straight_line', 0.00),
        ('Furniture & Seating', 'other', 12000.00, '2024-01-01', 84, 'straight_line', 1200.00),
    ]
    
    for name, inv_type, amount, purchase_date, useful_life, method, residual in base_investments:
        investments_sql.append(f"({inv_id}, '{name}', '{inv_type}', {amount:.2f}, '{purchase_date}', {useful_life}, '{method}', {residual:.2f}, '{name} investment')")
        investments_data.append((inv_id, amount, purchase_date, useful_life, method, residual))
        inv_id += 1
    
    return investments_sql, investments_data

def generate_depreciation_entries(investments_data, months=24):
    """Generate depreciation entries"""
    entries = []
    entry_id = 1
    
    for inv_id, amount, purchase_date_str, useful_life, method, residual in investments_data:
        purchase_date = datetime.datetime.strptime(purchase_date_str, '%Y-%m-%d').date()
        
        if method == 'straight_line':
            monthly_dep = (amount - residual) / useful_life
        else:
            rate = 2.0 / useful_life
            monthly_dep = amount * rate / 12
        
        accumulated = 0
        current_date = purchase_date.replace(day=1)
        end_date = purchase_date + datetime.timedelta(days=30 * months)
        
        while current_date <= end_date and accumulated < (amount - residual):
            month_str = f"{current_date.year}-{current_date.month:02d}"
            
            if method == 'declining_balance':
                book_value = amount - accumulated
                monthly_dep = book_value * rate / 12
                monthly_dep = min(monthly_dep, amount - residual - accumulated)
            
            accumulated += monthly_dep
            book_value = amount - accumulated
            
            entries.append(f"({entry_id}, {inv_id}, '{month_str}', {monthly_dep:.2f}, {accumulated:.2f}, {book_value:.2f})")
            entry_id += 1
            
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)
    
    return entries

def generate_financial_statements(months=24):
    """Generate financial statements for 2 years"""
    statements = {
        'cash_flow': [],
        'working_capital': [],
        'profit_loss': [],
        'balance_sheet': [],
        'financial_plan': [],
    }
    
    start_year = 2024
    start_month = 1
    opening_balance = 15000.00
    
    for i in range(months):
        year = start_year + (start_month + i - 1) // 12
        month = ((start_month + i - 1) % 12) + 1
        month_str = f"{year}-{month:02d}"
        
        # Coffee shop cash flow - seasonal variations
        seasonal_multiplier = 1.1 if month in [11, 12, 1, 2] else 0.95 if month in [6, 7, 8] else 1.0
        cash_inflows = (28000.00 + (i * 500)) * seasonal_multiplier
        cash_outflows = (22000.00 + (i * 400)) * seasonal_multiplier
        net_cash = cash_inflows - cash_outflows
        closing_balance = opening_balance + net_cash
        
        statements['cash_flow'].append(f"('{month_str}', {opening_balance:.2f}, {cash_inflows:.2f}, {cash_outflows:.2f}, {net_cash:.2f}, {closing_balance:.2f}, '{month_str} cash flow')")
        opening_balance = closing_balance
        
        # Working Capital
        ar = 3500.00 + (i * 150)
        inventory = 5000.00 + (i * 200)
        ap = 4000.00 + (i * 180)
        oca = 1500.00 + (i * 80)
        ocl = 1200.00 + (i * 40)
        wc_need = ar + inventory + oca - ap - ocl
        
        statements['working_capital'].append(f"('{month_str}', {ar:.2f}, {inventory:.2f}, {ap:.2f}, {oca:.2f}, {ocl:.2f}, {wc_need:.2f})")
        
        # P&L
        revenue = cash_inflows
        cogs = revenue * 0.35
        op_exp = 6000.00 + (i * 150)
        personnel = 18000.00 + (i * 200)
        leasing = 1380.00
        depreciation = 800.00 + (i * 30)
        interest = 350.00
        taxes = 1200.00 + (i * 40)
        other = 400.00
        gross_profit = revenue - cogs
        op_profit = gross_profit - op_exp - personnel - leasing - depreciation
        net_profit = op_profit - interest - taxes - other
        
        statements['profit_loss'].append(f"('{month_str}', {revenue:.2f}, {cogs:.2f}, {op_exp:.2f}, {personnel:.2f}, {leasing:.2f}, {depreciation:.2f}, {interest:.2f}, {taxes:.2f}, {other:.2f}, {gross_profit:.2f}, {op_profit:.2f}, {net_profit:.2f})")
        
        # Balance Sheet
        current_assets = 18000.00 + (i * 800)
        fixed_assets = 45000.00 - (i * 200)
        intangible = 0.00
        total_assets = current_assets + fixed_assets + intangible
        current_liab = 10000.00 + (i * 400)
        long_term_debt = 65000.00 - (i * 800)
        total_liab = current_liab + long_term_debt
        share_capital = 30000.00
        retained_earnings = -15000.00 + (i * 800)
        total_equity = share_capital + retained_earnings
        
        statements['balance_sheet'].append(f"('{month_str}', {current_assets:.2f}, {fixed_assets:.2f}, {intangible:.2f}, {total_assets:.2f}, {current_liab:.2f}, {long_term_debt:.2f}, {total_liab:.2f}, {share_capital:.2f}, {retained_earnings:.2f}, {total_equity:.2f})")
        
        # Financial Plan
        equity = 30000.00
        loans = 65000.00 - (i * 800)
        other_sources = 0.00
        total_sources = equity + loans + other_sources
        investments = 45000.00 if i == 0 else 0.00
        wc = wc_need
        loan_repayments = 1800.00
        other_uses = 3000.00 if i == 0 else 2000.00
        total_uses = investments + wc + loan_repayments + other_uses
        net_financing = total_sources - total_uses
        
        statements['financial_plan'].append(f"('{month_str}', {equity:.2f}, {loans:.2f}, {other_sources:.2f}, {total_sources:.2f}, {investments:.2f}, {wc:.2f}, {loan_repayments:.2f}, {other_uses:.2f}, {total_uses:.2f}, {net_financing:.2f})")
    
    return statements

def main():
    print("-- Comprehensive Seed Data for Dose - Coffee Shop Edition")
    print("-- Generated by generate_seed_data.py")
    print("-- This file contains 2 years (2024-2025) of coffee shop sample data")
    print("-- Small company: 3-8 sales per day (realistic for small business)")
    print("-- Run with: supabase db reset (applies migrations then seed.sql)")
    print()
    
    # Generate all data
    print("-- ============================================================================")
    print("-- VENDORS (30 vendor records)")
    print("-- ============================================================================")
    vendors = generate_vendors()
    print("INSERT INTO vendors (id, name, email, phone, address, contact_person, notes, is_active) VALUES")
    print(",\n".join(vendors) + ";")
    print("SELECT setval('vendors_id_seq', (SELECT MAX(id) FROM vendors));")
    print()
    
    print("-- ============================================================================")
    print("-- ITEMS (50 inventory items)")
    print("-- ============================================================================")
    items = generate_items()
    print("INSERT INTO items (id, name, description, category, sku, unit, unit_price, vendor_id, notes, is_active) VALUES")
    print(",\n".join(items) + ";")
    print("SELECT setval('items_id_seq', (SELECT MAX(id) FROM items));")
    print()
    
    print("-- ============================================================================")
    print("-- SUBSCRIPTIONS (Recurring expenses)")
    print("-- ============================================================================")
    subscriptions = generate_subscriptions()
    subscriptions_data = [(i+1, 100.00 + (i * 10), 'monthly', '2024-01-01') for i in range(len(subscriptions))]  # Simplified for expense generation
    print("INSERT INTO subscriptions (id, name, category, amount, recurrence, start_date, end_date, description, vendor, is_active) VALUES")
    print(",\n".join(subscriptions) + ";")
    print("SELECT setval('subscriptions_id_seq', (SELECT MAX(id) FROM subscriptions));")
    print()
    
    print("-- ============================================================================")
    print("-- EXPENSES (Expense payments)")
    print("-- ============================================================================")
    expenses, _ = generate_expenses_for_subscriptions(subscriptions_data, 24)
    print("INSERT INTO expenses (id, name, category, amount, recurrence, start_date, expense_date, description, vendor, subscription_id) VALUES")
    # Print in batches
    batch_size = 500
    for i in range(0, len(expenses), batch_size):
        batch = expenses[i:i+batch_size]
        if i > 0:
            print("INSERT INTO expenses (id, name, category, amount, recurrence, start_date, expense_date, description, vendor, subscription_id) VALUES")
        print(",\n".join(batch) + ";")
        if i + batch_size < len(expenses):
            print()
    print("SELECT setval('expenses_id_seq', (SELECT MAX(id) FROM expenses));")
    print()
    
    print("-- ============================================================================")
    print("-- LEASING PAYMENTS (3 leases)")
    print("-- ============================================================================")
    leases = generate_leasing_payments()
    print("INSERT INTO leasing_payments (id, name, type, amount, start_date, end_date, frequency, description, lessor, is_active) VALUES")
    print(",\n".join(leases) + ";")
    print("SELECT setval('leasing_payments_id_seq', (SELECT MAX(id) FROM leasing_payments));")
    print()
    
    print("-- ============================================================================")
    print("-- LOANS (2 loans)")
    print("-- ============================================================================")
    loans_sql, loans_data = generate_loans()
    print("INSERT INTO loans (id, name, loan_number, principal_amount, interest_rate, duration_months, start_date, status, lender, description) VALUES")
    print(",\n".join(loans_sql) + ";")
    print("SELECT setval('loans_id_seq', (SELECT MAX(id) FROM loans));")
    print()
    
    print("-- ============================================================================")
    print("-- LOAN SCHEDULES")
    print("-- ============================================================================")
    schedules = generate_loan_schedules(loans_data)
    print("INSERT INTO loan_schedules (id, loan_id, month, payment_date, principal_payment, interest_payment, total_payment, remaining_balance, is_paid, paid_date) VALUES")
    print(",\n".join(schedules) + ";")
    print("SELECT setval('loan_schedules_id_seq', (SELECT MAX(id) FROM loan_schedules));")
    print()
    
    print("-- ============================================================================")
    print("-- PERSONNEL (24 personnel records)")
    print("-- ============================================================================")
    personnel = generate_personnel()
    print("INSERT INTO personnel (id, first_name, last_name, email, position, type, base_salary, employer_charges, employer_charges_type, start_date, end_date, is_active, notes) VALUES")
    print(",\n".join(personnel) + ";")
    print("SELECT setval('personnel_id_seq', (SELECT MAX(id) FROM personnel));")
    print()
    print("-- NOTE: Personnel salary projections are calculated on-the-fly, not pre-inserted.")
    print("-- The personnel_salary_projections table stores actual payment records when payments are made.")
    print()
    
    print("-- ============================================================================")
    print("-- SALES (2 years: 2024-2025)")
    print("-- ============================================================================")
    sales = generate_sales(2024, 2025)
    print(f"-- Generating {len(sales)} sales records...")
    print("INSERT INTO sales (id, date, type, amount, quantity, description) VALUES")
    batch_size = 500
    for i in range(0, len(sales), batch_size):
        batch = sales[i:i+batch_size]
        if i > 0:
            print("INSERT INTO sales (id, date, type, amount, quantity, description) VALUES")
        print(",\n".join(batch) + ";")
        if i + batch_size < len(sales):
            print()
    print("SELECT setval('sales_id_seq', (SELECT MAX(id) FROM sales));")
    print()
    
    print("-- ============================================================================")
    print("-- INVESTMENTS (6 investments)")
    print("-- ============================================================================")
    investments_sql, investments_data = generate_investments()
    print("INSERT INTO investments (id, name, type, amount, purchase_date, useful_life_months, depreciation_method, residual_value, description) VALUES")
    print(",\n".join(investments_sql) + ";")
    print("SELECT setval('investments_id_seq', (SELECT MAX(id) FROM investments));")
    print()
    
    print("-- ============================================================================")
    print("-- DEPRECIATION ENTRIES (24 months)")
    print("-- ============================================================================")
    depreciation = generate_depreciation_entries(investments_data, 24)
    print(f"-- Generating {len(depreciation)} depreciation entries...")
    print("INSERT INTO depreciation_entries (id, investment_id, month, depreciation_amount, accumulated_depreciation, book_value) VALUES")
    batch_size = 500
    for i in range(0, len(depreciation), batch_size):
        batch = depreciation[i:i+batch_size]
        if i > 0:
            print("INSERT INTO depreciation_entries (id, investment_id, month, depreciation_amount, accumulated_depreciation, book_value) VALUES")
        print(",\n".join(batch) + ";")
        if i + batch_size < len(depreciation):
            print()
    print("SELECT setval('depreciation_entries_id_seq', (SELECT MAX(id) FROM depreciation_entries));")
    print()
    
    print("-- ============================================================================")
    print("-- FINANCIAL STATEMENTS (24 months: 2024-2025)")
    print("-- ============================================================================")
    statements = generate_financial_statements(24)
    
    print("-- Cash Flow")
    print("INSERT INTO cash_flow (month, opening_balance, cash_inflows, cash_outflows, net_cash_flow, closing_balance, notes) VALUES")
    print(",\n".join(statements['cash_flow']) + ";")
    print()
    
    print("-- Working Capital")
    print("INSERT INTO working_capital (month, accounts_receivable, inventory, accounts_payable, other_current_assets, other_current_liabilities, working_capital_need) VALUES")
    print(",\n".join(statements['working_capital']) + ";")
    print()
    
    print("-- Profit and Loss")
    print("INSERT INTO profit_and_loss (month, total_revenue, cost_of_goods_sold, operating_expenses, personnel_costs, leasing_costs, depreciation, interest_expense, taxes, other_expenses, gross_profit, operating_profit, net_profit) VALUES")
    print(",\n".join(statements['profit_loss']) + ";")
    print()
    
    print("-- Balance Sheet")
    print("INSERT INTO balance_sheet (month, current_assets, fixed_assets, intangible_assets, total_assets, current_liabilities, long_term_debt, total_liabilities, share_capital, retained_earnings, total_equity) VALUES")
    print(",\n".join(statements['balance_sheet']) + ";")
    print()
    
    print("-- Financial Plan")
    print("INSERT INTO financial_plan (month, equity, loans, other_sources, total_sources, investments, working_capital, loan_repayments, other_uses, total_uses, net_financing) VALUES")
    print(",\n".join(statements['financial_plan']) + ";")
    print()
    
    print("-- ============================================================================")
    print("-- VARIABLES")
    print("-- ============================================================================")
    print("INSERT INTO variables (name, type, value, unit, effective_date, end_date, description, is_active) VALUES")
    variables = [
        "('VAT Rate', 'tax', 19.0, 'percentage', '2024-01-01', NULL, 'Value Added Tax rate', true)",
        "('Corporate Tax Rate', 'tax', 25.0, 'percentage', '2024-01-01', NULL, 'Corporate income tax rate', true)",
        "('Inflation Rate', 'inflation', 8.5, 'percentage', '2024-01-01', NULL, 'Annual inflation rate', true)",
        "('EUR to TND Exchange Rate', 'exchange_rate', 3.25, 'rate', '2024-01-01', NULL, 'Euro to Tunisian Dinar exchange rate', true)",
        "('Minimum Wage', 'cost', 450.0, 'TND', '2024-01-01', NULL, 'Minimum monthly wage', true)",
        "('Social Security Rate', 'tax', 18.75, 'percentage', '2024-01-01', NULL, 'Employer social security contribution rate', true)",
        "('Employee Social Tax Rate', 'tax', 20.0, 'percentage', '2024-01-01', NULL, 'Employee social tax deduction rate (applied to brute salary to calculate net)', true)",
    ]
    print(",\n".join(variables) + ";")

if __name__ == '__main__':
    main()
