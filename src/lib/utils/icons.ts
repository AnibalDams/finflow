/**
 * Catálogo de iconos de Material Symbols agrupado por temas.
 *
 * Los nombres deben existir en la fuente `Material Symbols Outlined` que carga
 * `app.html`; si no, el navegador mostraría el texto del nombre. Los grupos
 * incluyen sinónimos en español para que el buscador del selector encuentre
 * iconos aunque su nombre esté en inglés.
 */

export interface IconGroup {
	id: string;
	label: string;
	icons: string[];
	keywords?: string[];
}

export const ICON_GROUPS: IconGroup[] = [
	{
		id: 'food',
		label: 'Alimentación',
		keywords: ['comida', 'restaurante', 'café', 'supermercado', 'despensa', 'bebida'],
		icons: [
			'restaurant',
			'local_cafe',
			'local_bar',
			'fastfood',
			'local_pizza',
			'bakery_dining',
			'lunch_dining',
			'dinner_dining',
			'icecream',
			'ramen_dining',
			'tapas',
			'set_meal',
			'cake',
			'local_grocery_store',
			'liquor'
		]
	},
	{
		id: 'transport',
		label: 'Transporte',
		keywords: ['transporte', 'auto', 'coche', 'gasolina', 'viaje', 'vuelo', 'estacionamiento'],
		icons: [
			'directions_car',
			'directions_bus',
			'train',
			'subway',
			'local_taxi',
			'directions_bike',
			'pedal_bike',
			'two_wheeler',
			'local_gas_station',
			'ev_station',
			'local_parking',
			'car_repair',
			'flight',
			'flight_takeoff',
			'directions_walk',
			'toll'
		]
	},
	{
		id: 'home',
		label: 'Hogar y servicios',
		keywords: ['hogar', 'casa', 'servicios', 'luz', 'agua', 'internet', 'renta', 'limpieza'],
		icons: [
			'home',
			'cottage',
			'apartment',
			'chair',
			'bed',
			'lightbulb',
			'water_drop',
			'bolt',
			'wifi',
			'local_laundry_service',
			'cleaning_services',
			'handyman',
			'plumbing',
			'propane_tank',
			'recycling',
			'router'
		]
	},
	{
		id: 'health',
		label: 'Salud',
		keywords: ['salud', 'médico', 'medicina', 'gimnasio', 'farmacia', 'seguro', 'bienestar'],
		icons: [
			'medical_services',
			'local_hospital',
			'medication',
			'vaccines',
			'monitor_heart',
			'fitness_center',
			'spa',
			'psychology',
			'dentistry',
			'visibility',
			'healing',
			'health_and_safety'
		]
	},
	{
		id: 'shopping',
		label: 'Compras',
		keywords: ['compras', 'tienda', 'ropa', 'regalo', 'belleza', 'moda'],
		icons: [
			'shopping_cart',
			'shopping_bag',
			'shopping_basket',
			'storefront',
			'local_mall',
			'checkroom',
			'dry_cleaning',
			'diamond',
			'card_giftcard',
			'redeem',
			'sell',
			'local_offer',
			'styler'
		]
	},
	{
		id: 'leisure',
		label: 'Ocio',
		keywords: [
			'ocio',
			'entretenimiento',
			'cine',
			'música',
			'deporte',
			'viaje',
			'suscripción',
			'juegos',
			'vacaciones'
		],
		icons: [
			'sports_esports',
			'movie',
			'theaters',
			'music_note',
			'sports_soccer',
			'sports_basketball',
			'sports_tennis',
			'pool',
			'beach_access',
			'celebration',
			'park',
			'hiking',
			'camping',
			'sailing',
			'attractions',
			'casino',
			'subscriptions',
			'headphones',
			'live_tv',
			'photo_camera'
		]
	},
	{
		id: 'education',
		label: 'Educación',
		keywords: ['educación', 'escuela', 'curso', 'libros', 'estudio', 'tecnología', 'programación'],
		icons: [
			'school',
			'menu_book',
			'auto_stories',
			'science',
			'computer',
			'code',
			'workspace_premium',
			'history_edu',
			'translate'
		]
	},
	{
		id: 'work',
		label: 'Trabajo e ingresos',
		keywords: [
			'trabajo',
			'ingresos',
			'salario',
			'negocio',
			'oficio',
			'herramientas',
			'freelance',
			'oficina'
		],
		icons: [
			'work',
			'business_center',
			'badge',
			'engineering',
			'construction',
			'architecture',
			'agriculture',
			'factory',
			'support_agent',
			'laptop_mac',
			'terminal',
			'design_services',
			'handshake'
		]
	},
	{
		id: 'finance',
		label: 'Finanzas',
		keywords: [
			'finanzas',
			'dinero',
			'banco',
			'tarjeta',
			'pago',
			'deuda',
			'préstamo',
			'ahorro',
			'inversión',
			'ingreso',
			'presupuesto'
		],
		icons: [
			'account_balance',
			'account_balance_wallet',
			'savings',
			'wallet',
			'credit_card',
			'payments',
			'currency_exchange',
			'receipt_long',
			'request_quote',
			'price_check',
			'attach_money',
			'monetization_on',
			'paid',
			'trending_up',
			'trending_down',
			'pie_chart',
			'stacked_line_chart',
			'calculate',
			'card_membership'
		]
	},
	{
		id: 'family',
		label: 'Familia',
		keywords: ['familia', 'hijos', 'mascotas', 'donaciones', 'iglesia', 'pareja'],
		icons: [
			'family_restroom',
			'group',
			'child_care',
			'pets',
			'volunteer_activism',
			'favorite',
			'church'
		]
	},
	{
		id: 'other',
		label: 'Otros',
		keywords: ['otros', 'general', 'varios', 'seguridad', 'tecnología', 'eventos', 'recordatorio'],
		icons: [
			'emoji_events',
			'military_tech',
			'shield',
			'security',
			'insights',
			'receipt',
			'description',
			'category',
			'label',
			'bookmark',
			'star',
			'flag',
			'smartphone',
			'devices',
			'cloud',
			'diversity_3',
			'key',
			'local_florist',
			'emergency'
		]
	}
];

/** Catálogo plano para categorías de gasto e ingreso. */
export const CATEGORY_ICONS: string[] = ICON_GROUPS.flatMap((group) => group.icons);

/** Grupos sugeridos en el selector de categorías. */
export const CATEGORY_ICON_GROUPS: IconGroup[] = ICON_GROUPS;

/** Grupos sugeridos para los iconos de obligaciones y deudas. */
export const DEBT_ICON_GROUPS: IconGroup[] = ICON_GROUPS.filter((group) =>
	['finance', 'transport', 'home', 'education', 'health', 'family', 'other'].includes(group.id)
);

/** Catálogo plano para el icono propio de una deuda. */
export const DEBT_ICONS: string[] = DEBT_ICON_GROUPS.flatMap((group) => group.icons);
