// Integration Types
export type IntegrationType = 'square' | 'stripe' | 'shopify' | 'other';

export type IntegrationStatus = 'pending' | 'connected' | 'disconnected' | 'error';

export type SyncFrequency = 'manual' | 'hourly' | 'daily' | 'realtime';

export type SyncStatus = 'success' | 'error' | 'in_progress';

export interface Integration {
  id: number;
  account_id: string;
  integration_type: IntegrationType;
  name: string;
  status: IntegrationStatus;
  access_token?: string | null;
  refresh_token?: string | null;
  token_expires_at?: string | null;
  config: Record<string, any>;
  last_sync_at?: string | null;
  last_sync_status?: SyncStatus | null;
  last_sync_error?: string | null;
  sync_frequency: SyncFrequency;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateIntegrationData {
  integration_type: IntegrationType;
  name: string;
  config?: Record<string, any>;
  sync_frequency?: SyncFrequency;
}

export interface UpdateIntegrationData {
  name?: string;
  status?: IntegrationStatus;
  config?: Record<string, any>;
  sync_frequency?: SyncFrequency;
  is_active?: boolean;
}

// Square-specific types
export interface SquareLocation {
  id: string;
  name: string;
  address?: {
    address_line_1?: string;
    address_line_2?: string;
    locality?: string;
    administrative_district_level_1?: string;
    postal_code?: string;
    country?: string;
  };
  timezone?: string;
  capabilities?: string[];
  status?: string;
  created_at?: string;
  merchant_id?: string;
}

export interface SquareOrder {
  id: string;
  location_id: string;
  reference_id?: string;
  source?: {
    name?: string;
  };
  customer_id?: string;
  line_items: SquareLineItem[];
  taxes?: SquareOrderTax[];
  discounts?: SquareOrderDiscount[];
  service_charges?: SquareServiceCharge[];
  fulfillments?: SquareFulfillment[];
  net_amounts: {
    total_money: SquareMoney;
    tax_money?: SquareMoney;
    discount_money?: SquareMoney;
    tip_money?: SquareMoney;
    service_charge_money?: SquareMoney;
  };
  created_at: string;
  updated_at: string;
  state: string;
  version?: number;
  total_money?: SquareMoney;
  total_tax_money?: SquareMoney;
  total_discount_money?: SquareMoney;
  total_tip_money?: SquareMoney;
  total_service_charge_money?: SquareMoney;
}

export interface SquareLineItem {
  uid?: string;
  name?: string;
  quantity: string;
  item_type?: string;
  base_price_money?: SquareMoney;
  variation_name?: string;
  note?: string;
  catalog_object_id?: string;
  catalog_version?: number;
  modifiers?: SquareOrderLineItemModifier[];
  applied_taxes?: SquareOrderLineItemAppliedTax[];
  applied_discounts?: SquareOrderLineItemAppliedDiscount[];
  gross_sales_money?: SquareMoney;
  total_tax_money?: SquareMoney;
  total_discount_money?: SquareMoney;
  total_money?: SquareMoney;
  total_service_charge_money?: SquareMoney;
}

export interface SquareOrderLineItemModifier {
  uid?: string;
  catalog_object_id?: string;
  catalog_version?: number;
  name?: string;
  base_price_money?: SquareMoney;
  total_price_money?: SquareMoney;
}

export interface SquareOrderLineItemAppliedTax {
  uid?: string;
  tax_uid: string;
  applied_money?: SquareMoney;
}

export interface SquareOrderLineItemAppliedDiscount {
  uid?: string;
  discount_uid: string;
  applied_money?: SquareMoney;
}

export interface SquareOrderTax {
  uid?: string;
  name?: string;
  percentage?: string;
  type?: string;
  applied_money?: SquareMoney;
  scope?: string;
}

export interface SquareOrderDiscount {
  uid?: string;
  name?: string;
  percentage?: string;
  amount_money?: SquareMoney;
  type?: string;
  scope?: string;
}

export interface SquareServiceCharge {
  uid?: string;
  name?: string;
  calculation_phase?: string;
  percentage?: string;
  amount_money?: SquareMoney;
  applied_money?: SquareMoney;
  total_money?: SquareMoney;
  total_tax_money?: SquareMoney;
  taxable?: boolean;
}

export interface SquareFulfillment {
  uid?: string;
  type?: string;
  state?: string;
  pickup_details?: SquarePickupDetails;
  shipment_details?: SquareShipmentDetails;
}

export interface SquarePickupDetails {
  recipient?: SquareFulfillmentRecipient;
  expires_at?: string;
  auto_complete_duration?: string;
  schedule_type?: string;
  pickup_at?: string;
  pickup_window_duration?: string;
  prep_time_duration?: string;
  note?: string;
  placed_at?: string;
  accepted_at?: string;
  rejected_at?: string;
  ready_at?: string;
  expired_at?: string;
  picked_up_at?: string;
  canceled_at?: string;
  cancel_reason?: string;
}

export interface SquareShipmentDetails {
  recipient?: SquareFulfillmentRecipient;
  carrier?: string;
  shipping_note?: string;
  shipping_type?: string;
  tracking_number?: string;
  tracking_url?: string;
  placed_at?: string;
  in_progress_at?: string;
  packaged_at?: string;
  expected_shipped_at?: string;
  shipped_at?: string;
  canceled_at?: string;
  cancel_reason?: string;
  failed_at?: string;
  failure_reason?: string;
}

export interface SquareFulfillmentRecipient {
  display_name?: string;
  email_address?: string;
  phone_number?: string;
  address?: SquareAddress;
}

export interface SquareAddress {
  address_line_1?: string;
  address_line_2?: string;
  address_line_3?: string;
  locality?: string;
  sublocality?: string;
  sublocality_2?: string;
  sublocality_3?: string;
  administrative_district_level_1?: string;
  administrative_district_level_2?: string;
  administrative_district_level_3?: string;
  postal_code?: string;
  country?: string;
  first_name?: string;
  last_name?: string;
  organization?: string;
}

export interface SquareMoney {
  amount: number;
  currency: string;
}

export interface SquarePayment {
  id: string;
  created_at: string;
  updated_at: string;
  amount_money: SquareMoney;
  status: string;
  delay_duration?: string;
  delay_action?: string;
  delayed_until?: string;
  source_type?: string;
  card_details?: SquareCardDetails;
  location_id?: string;
  order_id?: string;
  reference_id?: string;
  customer_id?: string;
  employee_id?: string;
  team_member_id?: string;
  refund_ids?: string[];
  risk_evaluation?: SquareRiskEvaluation;
  buyer_email_address?: string;
  billing_address?: SquareAddress;
  shipping_address?: SquareAddress;
  note?: string;
  statement_description_identifier?: string;
  capabilities?: string[];
  receipt_number?: string;
  receipt_url?: string;
  device_details?: SquareDeviceDetails;
  application_details?: SquareApplicationDetails;
  version_token?: string;
}

export interface SquareCardDetails {
  status?: string;
  card?: SquareCard;
  entry_method?: string;
  cvv_status?: string;
  avs_status?: string;
  statement_description?: string;
  device_details?: SquareDeviceDetails;
  refund_requires_card_presence?: boolean;
  errors?: SquareError[];
}

export interface SquareCard {
  card_brand?: string;
  last_4?: string;
  exp_month?: number;
  exp_year?: number;
  cardholder_name?: string;
  billing_address?: SquareAddress;
  fingerprint?: string;
  customer_id?: string;
  merchant_id?: string;
  reference_id?: string;
  enabled_payout?: boolean;
  enabled?: boolean;
  card_type?: string;
  prepaid_type?: string;
  bin?: string;
  version?: number;
  entry_method?: string;
  card_co_brand?: string;
}

export interface SquareRiskEvaluation {
  created_at?: string;
  risk_level?: string;
}

export interface SquareDeviceDetails {
  device_id?: string;
  device_installation_id?: string;
  device_name?: string;
}

export interface SquareApplicationDetails {
  square_product?: string;
  application_id?: string;
}

export interface SquareError {
  category: string;
  code: string;
  detail?: string;
  field?: string;
}

export interface SquareCatalogObject {
  type: string;
  id: string;
  updated_at?: string;
  version?: number;
  is_deleted?: boolean;
  catalog_v1_ids?: Array<{ catalog_v1_id?: string; location_id?: string }>;
  present_at_all_locations?: boolean;
  present_at_location_ids?: string[];
  absent_at_location_ids?: string[];
  image_id?: string;
  item_data?: SquareCatalogItem;
  category_data?: SquareCatalogCategory;
  item_variation_data?: SquareCatalogItemVariation;
  tax_data?: SquareCatalogTax;
  discount_data?: SquareCatalogDiscount;
  modifier_list_data?: SquareCatalogModifierList;
  modifier_data?: SquareCatalogModifier;
  time_period_data?: SquareCatalogTimePeriod;
  product_set_data?: SquareCatalogProductSet;
  pricing_rule_data?: SquareCatalogPricingRule;
  image_data?: SquareCatalogImage;
  measurement_unit_data?: SquareCatalogMeasurementUnit;
  subscription_plan_data?: SquareCatalogSubscriptionPlan;
  item_option_data?: SquareCatalogItemOption;
  item_option_value_data?: SquareCatalogItemOptionValue;
  custom_attribute_definition_data?: SquareCatalogCustomAttributeDefinition;
  quick_amounts_settings_data?: SquareCatalogQuickAmountsSettings;
}

export interface SquareCatalogItem {
  name?: string;
  description?: string;
  abbreviation?: string;
  label_color?: string;
  available_online?: boolean;
  available_for_pickup?: boolean;
  available_electronically?: boolean;
  category_id?: string;
  tax_ids?: string[];
  modifier_list_info?: Array<{
    modifier_list_id: string;
    modifier_overrides?: Array<{
      modifier_id: string;
      on_by_default?: boolean;
    }>;
    min_selected_modifiers?: number;
    max_selected_modifiers?: number;
    enabled?: boolean;
  }>;
  variations?: SquareCatalogObject[];
  product_type?: string;
  skip_modifier_screen?: boolean;
  item_options?: SquareCatalogObject[];
  image_ids?: string[];
  sort_name?: string;
  description_html?: string;
  description_plaintext?: string;
}

export interface SquareCatalogCategory {
  name?: string;
  image_ids?: string[];
}

export interface SquareCatalogItemVariation {
  item_id?: string;
  name?: string;
  sku?: string;
  upc?: string;
  ordinal?: number;
  pricing_type?: string;
  price_money?: SquareMoney;
  location_overrides?: Array<{
    location_id: string;
    price_money?: SquareMoney;
    pricing_type?: string;
    track_inventory?: boolean;
    inventory_alert_type?: string;
    inventory_alert_threshold?: number;
  }>;
  track_inventory?: boolean;
  inventory_alert_type?: string;
  inventory_alert_threshold?: number;
  user_data?: string;
  service_duration?: number;
  item_option_values?: Array<{
    item_option_id?: string;
    item_option_value_id?: string;
  }>;
  measurement_unit_id?: string;
  sellable?: boolean;
  stockable?: boolean;
  image_ids?: string[];
  team_member_ids?: string[];
  stockable_conversion?: {
    stockable_item_variation_id?: string;
    stockable_quantity?: string;
    nonstockable_quantity?: string;
  };
}

export interface SquareCatalogTax {
  name?: string;
  calculation_phase?: string;
  inclusion_type?: string;
  percentage?: string;
  applies_to_custom_amounts?: boolean;
  enabled?: boolean;
}

export interface SquareCatalogDiscount {
  name?: string;
  discount_type?: string;
  percentage?: string;
  amount_money?: SquareMoney;
  pin_required?: boolean;
  label_color?: string;
  modify_tax_basis?: string;
  maximum_amount_money?: SquareMoney;
}

export interface SquareCatalogModifierList {
  name?: string;
  ordinal?: number;
  selection_type?: string;
  modifiers?: SquareCatalogObject[];
  image_ids?: string[];
}

export interface SquareCatalogModifier {
  name?: string;
  price_money?: SquareMoney;
  ordinal?: number;
  modifier_list_id?: string;
  image_id?: string;
}

export interface SquareCatalogTimePeriod {
  event?: string;
}

export interface SquareCatalogProductSet {
  name?: string;
  product_ids_any?: string[];
  product_ids_all?: string[];
  quantity_exact?: number;
  quantity_min?: number;
  quantity_max?: number;
  all_products?: boolean;
}

export interface SquareCatalogPricingRule {
  name?: string;
  time_period_ids?: string[];
  discount_id?: string;
  match_products_id?: string;
  apply_products_id?: string;
  exclude_products_id?: string;
  valid_from_date?: string;
  valid_from_local_time?: string;
  valid_until_date?: string;
  valid_until_local_time?: string;
  exclude_strategy?: string;
  minimum_order_subtotal_money?: SquareMoney;
  customer_group_ids_any?: string[];
}

export interface SquareCatalogImage {
  name?: string;
  url?: string;
  caption?: string;
}

export interface SquareCatalogMeasurementUnit {
  measurement_unit?: {
    custom_unit?: {
      name: string;
      abbreviation: string;
    };
    area_unit?: string;
    length_unit?: string;
    volume_unit?: string;
    weight_unit?: string;
    generic_unit?: string;
    time_unit?: string;
    type?: string;
  };
  precision?: number;
}

export interface SquareCatalogSubscriptionPlan {
  name?: string;
  phases?: Array<{
    cadence?: string;
    periods?: number;
    recurring_price_money?: SquareMoney;
    ordinal?: number;
  }>;
}

export interface SquareCatalogItemOption {
  name?: string;
  display_name?: string;
  description?: string;
  show_colors?: boolean;
  values?: SquareCatalogObject[];
}

export interface SquareCatalogItemOptionValue {
  name?: string;
  description?: string;
  color?: string;
  ordinal?: number;
  item_option_id?: string;
}

export interface SquareCatalogCustomAttributeDefinition {
  name?: string;
  type?: string;
  selection_config?: {
    max_allowed_selections?: number;
    allowed_selections?: Array<{
      uid?: string;
      name?: string;
    }>;
  };
  number_config?: {
    precision?: number;
  };
  string_config?: {
    enforce_uniqueness?: boolean;
  };
  source_application?: {
    product?: string;
    application_id?: string;
    name?: string;
  };
}

export interface SquareCatalogQuickAmountsSettings {
  option?: string;
  eligible_for_auto_amounts?: boolean;
  amounts?: Array<{
    type?: string;
    amount_money?: SquareMoney;
    score?: number;
    ordinal?: number;
  }>;
}

// Square API Response types
export interface SquareApiResponse<T> {
  data?: T;
  errors?: SquareError[];
  cursor?: string;
}

export interface SquareListOrdersResponse {
  orders?: SquareOrder[];
  cursor?: string;
  errors?: SquareError[];
}

export interface SquareListPaymentsResponse {
  payments?: SquarePayment[];
  cursor?: string;
  errors?: SquareError[];
}

export interface SquareListLocationsResponse {
  locations?: SquareLocation[];
  cursor?: string;
  errors?: SquareError[];
}

export interface SquareListCatalogResponse {
  objects?: SquareCatalogObject[];
  cursor?: string;
  errors?: SquareError[];
}

// Integration sync data
export interface IntegrationSyncData {
  integration_id: number;
  sync_type: 'orders' | 'payments' | 'catalog' | 'locations' | 'full';
  status: SyncStatus;
  records_synced?: number;
  records_failed?: number;
  started_at: string;
  completed_at?: string;
  error?: string;
}

