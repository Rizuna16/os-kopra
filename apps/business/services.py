ONBOARDING_TEMPLATES = [
    "Bangunan & Perkakas",
    "Sembako & Kebutuhan Harian",
    "Fashion",
    "Makanan & Minuman",
    "Elektronik & Komputer",
    "Kecantikan & Perawatan",
    "Kesehatan & Apotek",
    "Rumah Tangga & Furniture",
    "Otomotif & Sparepart",
    "Buku & Alat Tulis",
    "Grosir & Distributor",
    "Usaha Lainnya"
]

SHARED_CORE = {
    "product_management": True,
    "inventory_management": True,
    "supplier_management": True,
    "purchasing": True,
    "sales_pos": True,
    "customer_management": True,
    "promotion_loyalty": True,
    "reporting": True,
    "notification": True,
    "security_audit": True,
}

BUSINESS_TYPE_FEATURES = {
    "Bangunan & Perkakas": {
        **SHARED_CORE,
        "variants": False,
        "serial_tracking": False,
        "batch_expiry_tracking": False,
        "loyalty_programs": False,
    },
    "Sembako & Kebutuhan Harian": {
        **SHARED_CORE,
        "variants": False,
        "serial_tracking": False,
        "batch_expiry_tracking": False,
        "loyalty_programs": True,
    },
    "Fashion": {
        **SHARED_CORE,
        "variants": True,
        "serial_tracking": False,
        "batch_expiry_tracking": False,
        "loyalty_programs": True,
    },
    "Makanan & Minuman": {
        **SHARED_CORE,
        "variants": False,
        "serial_tracking": False,
        "batch_expiry_tracking": True,
        "loyalty_programs": True,
    },
    "Elektronik & Komputer": {
        **SHARED_CORE,
        "variants": False,
        "serial_tracking": True,
        "batch_expiry_tracking": False,
        "loyalty_programs": False,
    },
    "Kecantikan & Perawatan": {
        **SHARED_CORE,
        "variants": True,
        "serial_tracking": False,
        "batch_expiry_tracking": False,
        "loyalty_programs": True,
    },
    "Kesehatan & Apotek": {
        **SHARED_CORE,
        "variants": False,
        "serial_tracking": True,
        "batch_expiry_tracking": True,
        "loyalty_programs": False,
    },
    "Rumah Tangga & Furniture": {
        **SHARED_CORE,
        "variants": True,
        "serial_tracking": False,
        "batch_expiry_tracking": False,
        "loyalty_programs": False,
    },
    "Otomotif & Sparepart": {
        **SHARED_CORE,
        "variants": False,
        "serial_tracking": True,
        "batch_expiry_tracking": True,
        "loyalty_programs": False,
    },
    "Buku & Alat Tulis": {
        **SHARED_CORE,
        "variants": False,
        "serial_tracking": False,
        "batch_expiry_tracking": False,
        "loyalty_programs": False,
    },
    "Grosir & Distributor": {
        **SHARED_CORE,
        "variants": False,
        "serial_tracking": False,
        "batch_expiry_tracking": False,
        "loyalty_programs": False,
    },
    "Usaha Lainnya": {
        **SHARED_CORE,
        "variants": False,
        "serial_tracking": False,
        "batch_expiry_tracking": False,
        "loyalty_programs": False,
    },
}


def get_business_feature_matrix(business_type):
    """Return deterministic feature matrix for a canonical business type."""
    if business_type not in BUSINESS_TYPE_FEATURES:
        raise ValueError(f"Unknown business type: {business_type}")
    return dict(BUSINESS_TYPE_FEATURES[business_type])

