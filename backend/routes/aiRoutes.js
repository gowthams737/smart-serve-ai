import express from 'express';
import ServiceCategory from '../models/ServiceCategory.js';
import Provider from '../models/Provider.js';
import Service from '../models/Service.js';
import Booking from '../models/Booking.js';
import Customer from '../models/Customer.js';
import ChatConversation from '../models/ChatConversation.js';
import { parseDocumentAttachment } from '../utils/documentParser.js';
import { normalizeImageUrl } from '../utils/imageHandler.js';

const router = express.Router();

/**
 * Standardize dates to DD/MM/YYYY format across the project.
 */
export function formatDateDDMMYYYY(dateInput) {
  if (!dateInput) return 'N/A';
  if (typeof dateInput === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) {
    return dateInput;
  }
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
    const parts = dateInput.split('T')[0].split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Comprehensive taxonomy of supported categories with aliases, misspellings,
 * and common Tanglish expressions.
 */
export const CATEGORY_DEFINITIONS = [
  {
    name: 'Electrician',
    aliases: [
      'electrician', 'electricians', 'electrition', 'electritions', 'electritian', 'electrian', 'electrisian',
      'electrishan', 'electrishans', 'electrision', 'electritioan',
      'electrical', 'electric', 'electricity', 'wiring', 'wire', 'wires',
      'switch', 'switches', 'switchboard', 'mcb', 'fuse', 'short circuit',
      'ceiling fan', 'exhaust fan', 'fan', 'fans', 'tube light', 'tubelight',
      'light bulb', 'bulb', 'lights', 'light', 'chandelier', 'inverter',
      'plug', 'socket', 'earthing', 'power failure', 'power cut',
      // Tanglish & Tamil
      'karan velai', 'current velai', 'current switch', 'fan repair',
      'fan oodala', 'fan suthala', 'light eriyala', 'wire burnt',
      'fan panna aal', 'fan maata', 'switch maatha', 'current repair',
      'current theva', 'electrician theva', 'electrician venum'
    ]
  },
  {
    name: 'Plumber',
    aliases: [
      'plumber', 'plumbers', 'plumbr', 'plumbbr', 'plumar', 'plumbar', 'plumb', 'plumbing', 'pipe', 'pipes',
      'leak', 'leaks', 'leakage', 'leaking', 'tap', 'taps', 'faucet',
      'faucets', 'sink', 'washbasin', 'wash basin', 'drain', 'drainage',
      'clog', 'clogged', 'flush', 'flush tank', 'commode', 'toilet',
      'shower', 'water tank', 'tank leak', 'sump motor', 'motor repair',
      // Tanglish & Tamil
      'thanni leak', 'pipe leak', 'pipe repair', 'thanni varala',
      'tap udanchu', 'plumbing velai', 'drainage block', 'sink block',
      'plumber venum', 'plumber theva'
    ]
  },
  {
    name: 'Carpenter',
    aliases: [
      'carpenter', 'carpenters', 'carpanter', 'carpentar', 'carpentry', 'wood',
      'woodwork', 'wooden', 'furniture', 'table', 'chair', 'bed',
      'cot', 'wardrobe', 'cupboard', 'cabinet', 'door', 'doors',
      'door lock', 'lock', 'latch', 'hinge', 'shelf', 'shelves',
      // Tanglish & Tamil
      'maravelai', 'mara velai', 'kadhavu repair', 'poottu repair',
      'door maata', 'carpenter theva', 'carpenter venum'
    ]
  },
  {
    name: 'Painter',
    aliases: [
      'painter', 'painters', 'paint', 'painting', 'paining', 'whitewash',
      'wall paint', 'interior paint', 'exterior paint', 'distemper',
      'primer', 'putty', 'wall stain', 'waterproofing', 'colouring',
      // Tanglish & Tamil
      'vellayadikka', 'vanna velai', 'veetukku paint', 'wall painting',
      'paint adikka', 'colour adikka', 'painter venum', 'painter theva'
    ]
  },
  {
    name: 'AC Repair',
    aliases: [
      'ac repair', 'ac service', 'ac servicing', 'air conditioner',
      'air conditioning', 'ac cooling', 'cooling problem', 'gas refill',
      'ac gas', 'ac leak', 'ac leaking', 'ac water leak', 'air conditioner leak',
      'ac not cooling', 'split ac', 'window ac', 'hvac', 'ac installation',
      'ac uninstall', 'ac technician', 'ac technicians',
      // Tanglish & Tamil
      'ac kulirala', 'ac leakaaguthu', 'ac kaathu varala', 'ac repair panna',
      'ac service panna', 'ac venum'
    ]
  },
  {
    name: 'Home Cleaning',
    aliases: [
      'home cleaning', 'house cleaning', 'cleaner', 'cleaners', 'cleaning',
      'cleenar', 'cleening', 'maid', 'dusting', 'sweeping', 'mopping',
      'housekeeping', 'room cleaning',
      // Tanglish & Tamil
      'veedu clean', 'veedu cleaning', 'veedu sutham', 'cleaning aal',
      'cleaner venum', 'cleaner theva'
    ]
  },
  {
    name: 'Deep Cleaning',
    aliases: [
      'deep cleaning', 'full home deep cleaning', 'bathroom cleaning',
      'kitchen cleaning', 'kitchen deep cleaning', 'sofa cleaning',
      'sofa shampooing', 'carpet cleaning', 'floor scrubbing', 'water tank cleaning'
    ]
  },
  {
    name: 'Pest Control',
    aliases: [
      'pest control', 'pest', 'termite', 'termites', 'cockroach',
      'cockroaches', 'bed bug', 'bed bugs', 'bedbug', 'mosquito',
      'rodent', 'rat', 'rats', 'ants', 'insect', 'bugs',
      // Tanglish & Tamil
      'karappan poochi', 'kallayan', 'poochi marundhu'
    ]
  },
  {
    name: 'RO Water Purifier',
    aliases: [
      'ro water purifier', 'ro', 'purifier', 'water purifier',
      'filter change', 'filter replacement', 'aquaguard', 'kent',
      'water filter', 'tds', 'ro repair',
      // Tanglish & Tamil
      'kudineer filter', 'water filter'
    ]
  },
  {
    name: 'Gardening',
    aliases: [
      'gardening', 'gardener', 'garden', 'lawn', 'plants',
      'landscaping', 'tree pruning', 'grass cutting',
      // Tanglish & Tamil
      'thottam velai', 'thotta kaaran', 'thottam'
    ]
  },
  {
    name: 'Beautician',
    aliases: [
      'beautician', 'beauty', 'salon', 'parlour', 'facial',
      'waxing', 'haircut', 'pedicure', 'manicure', 'makeup',
      'bridal makeup'
    ]
  },
  {
    name: 'Interior Designer',
    aliases: [
      'interior designer', 'interior design', 'interior', 'interiors',
      'home interior', 'modular kitchen', 'false ceiling', 'space design'
    ]
  }
];

export const GENERIC_PROVIDER_STOPWORDS = new Set([
  'provider', 'master', 'expert', 'pro', 'technician', 'service', 'services',
  'electrician', 'plumber', 'carpenter', 'painter', 'cleaner', 'contractor',
  'specialist', 'alpha', 'beta', 'test', 'mr', 'mrs', 'ms', 'dr'
]);

/**
 * Escapes string for regex usage.
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Matches category in text using taxonomy and active MongoDB categories.
 * Prioritizes multi-word / longer alias matches to prevent partial collisions.
 */
export function findCategoryInText(text, categories = []) {
  if (!text || typeof text !== 'string') return null;
  const clean = text.toLowerCase().trim();

  // Sort all aliases across definitions by descending length
  const allAliases = [];
  for (const def of CATEGORY_DEFINITIONS) {
    for (const alias of def.aliases) {
      allAliases.push({ alias, categoryName: def.name });
    }
  }
  allAliases.sort((a, b) => b.alias.length - a.alias.length);

  for (const item of allAliases) {
    const aliasBase = item.alias;
    const aliasPlural = aliasBase.endsWith('s') ? aliasBase.slice(0, -1) : aliasBase + 's';
    const pattern = new RegExp(`(?:^|[^a-z0-9])(?:${escapeRegex(aliasBase)}|${escapeRegex(aliasPlural)})(?:$|[^a-z0-9])`, 'i');
    if (pattern.test(clean)) {
      const activeDoc = categories.find(c => c.name.toLowerCase() === item.categoryName.toLowerCase()) || null;
      return {
        name: item.categoryName,
        categoryDoc: activeDoc
      };
    }
  }

  // Check raw active categories from DB
  for (const cat of categories) {
    const catNameLower = cat.name.toLowerCase();
    const catPlural = catNameLower.endsWith('s') ? catNameLower.slice(0, -1) : catNameLower + 's';
    const pattern = new RegExp(`(?:^|[^a-z0-9])(?:${escapeRegex(catNameLower)}|${escapeRegex(catPlural)})(?:$|[^a-z0-9])`, 'i');
    if (pattern.test(clean)) {
      return {
        name: cat.name,
        categoryDoc: cat
      };
    }
  }

  return null;
}

/**
 * Matches provider by distinctive personal name parts.
 */
export function findProviderByName(text, providerList = []) {
  if (!text || typeof text !== 'string') return null;
  const clean = text.toLowerCase().trim();

  for (const p of providerList) {
    const fullName = p.name.toLowerCase();
    if (clean.includes(fullName)) return p;
    const parts = fullName.split(/[\s.]+/).filter(part => part.length >= 3 && !GENERIC_PROVIDER_STOPWORDS.has(part));
    if (parts.length > 0 && parts.some(part => clean.includes(part))) {
      return p;
    }
  }
  return null;
}

/**
 * Extracts active service category by checking current message first,
 * then looking backwards in conversation history for context continuity.
 */
export function extractActiveCategory(userMessage, history = [], categories = [], providerList = []) {
  // 1. Current message explicit category
  const explicit = findCategoryInText(userMessage, categories);
  if (explicit) {
    return explicit.name;
  }

  // 2. Current message specific provider reference
  const explicitProvider = findProviderByName(userMessage, providerList);
  if (explicitProvider && explicitProvider.category) {
    return explicitProvider.category;
  }

  // 3. Backward history inspection for context retention
  if (Array.isArray(history) && history.length > 0) {
    for (let i = history.length - 1; i >= 0; i--) {
      const item = history[i];
      const text = item.text || '';
      const catInHist = findCategoryInText(text, categories);
      if (catInHist) {
        return catInHist.name;
      }
      const provInHist = findProviderByName(text, providerList);
      if (provInHist && provInHist.category) {
        return provInHist.category;
      }
    }
  }

  return null;
}

/**
 * Detects user intent based on message and ongoing context.
 */
export function detectIntent(userMessage, activeCategory = null, providerList = []) {
  const query = (userMessage || '').toLowerCase().trim();

  // 1. Unsupported services
  const unsupportedKeywords = [
    'helicopter', 'airplane', 'aeroplane', 'flight', 'yacht', 'submarine', 'spaceship', 'rocket',
    'brain surgery', 'plastic surgery', 'dental', 'dentist', 'doctor', 'hospital', 'medical', 'medicine',
    'car repair', 'car wash', 'bike service', 'motorcycle', 'mechanic for car',
    'pet grooming', 'dog walking', 'vet', 'veterinary',
    'catering', 'cooking food', 'chef', 'restaurant',
    'tattoo', 'piercing', 'legal advice', 'lawyer', 'attorney', 'court',
    'real estate', 'buy house', 'sell house', 'crypto', 'stock trading', 'bitcoin'
  ];

  for (const uk of unsupportedKeywords) {
    const pattern = new RegExp(`(?:^|[^a-z0-9])${escapeRegex(uk)}(?:$|[^a-z0-9])`, 'i');
    if (pattern.test(query)) {
      return { type: 'UNSUPPORTED_SERVICE', keyword: uk };
    }
  }

  // 2. Customer booking query (e.g. "my bookings", "show my booking")
  const isBookingAction =
    query.startsWith('confirm booking') ||
    query.startsWith('book') ||
    query.includes('want to book') ||
    query.includes('hire') ||
    query.includes('book with') ||
    query.includes('book for');

  const isCustomerBookings =
    !isBookingAction &&
    (
      query.includes('my booking') ||
      query.includes('my bookings') ||
      query.includes('show booking') ||
      query.includes('check booking') ||
      query.includes('view booking') ||
      query.includes('booking status') ||
      query.includes('active booking') ||
      query.includes('current booking') ||
      query.includes('past booking') ||
      query.includes('existing booking') ||
      query.includes('what are my bookings') ||
      query.includes('track my booking') ||
      query.includes('someone else') ||
      query.includes('other customer')
    );

  if (isCustomerBookings) {
    return { type: 'CUSTOMER_BOOKINGS' };
  }

  // 3. Booking instruction, action, or scheduling intent
  const namedProvider = findProviderByName(query, providerList);
  const isBookingInstruction =
    isBookingAction ||
    query.includes('how to book') ||
    query.includes('how do i book') ||
    query.includes('how can i book') ||
    query.includes('steps to book') ||
    query.includes('booking process') ||
    query.includes('booking epdi') ||
    query.includes('book panrathu epdi') ||
    query.includes('want to book') ||
    query.includes('confirm booking') ||
    query.includes('schedule an appointment') ||
    query.startsWith('book ') ||
    query.startsWith('hire ');

  if (isBookingInstruction) {
    return { type: 'BOOKING_INSTRUCTION', provider: namedProvider };
  }

  // 4. Specific Provider lookup (when not booking)
  if (namedProvider && !query.includes('cost') && !query.includes('price')) {
    return { type: 'SPECIFIC_PROVIDER_SEARCH', provider: namedProvider };
  }

  // 5. Pricing & cost inquiries
  const isPricing =
    query.includes('cost') ||
    query.includes('price') ||
    query.includes('pricing') ||
    query.includes('how much') ||
    query.includes('rate') ||
    query.includes('rates') ||
    query.includes('charges') ||
    query.includes('fee') ||
    query.includes('fees') ||
    query.includes('evlo') ||
    query.includes('evlo aagum') ||
    query.includes('kattanam') ||
    query.includes('estimate') ||
    query.includes('budget');

  if (isPricing) {
    return { type: 'PRICING_INQUIRY' };
  }

  // 6. Availability & working hours
  const isAvailability =
    query.includes('available today') ||
    query.includes('available tomorrow') ||
    query.includes('working hour') ||
    query.includes('working hours') ||
    query.includes('working days') ||
    query.includes('schedule') ||
    query.includes('timing') ||
    query.includes('open today') ||
    query.includes('when is') ||
    query.includes('when can') ||
    query.includes('innaiku irukangala') ||
    query.includes('naalaiku') ||
    query.includes('timing enna') ||
    query.includes('what time') ||
    query.includes('are they available') ||
    query.includes('is available');

  if (isAvailability) {
    return { type: 'AVAILABILITY_INQUIRY' };
  }

  // 7. Ambiguous short queries
  if (/^(help|help me|problem|repair|service|need help|fix it|issue)(\?|\.)?$/i.test(query)) {
    return { type: 'AMBIGUOUS_QUERY' };
  }

  // 8. Service search / recommendation
  if (activeCategory) {
    return { type: 'SERVICE_SEARCH_OR_RECOMMEND' };
  }

  const isDiscovery =
    query.includes('need') ||
    query.includes('want') ||
    query.includes('find') ||
    query.includes('show') ||
    query.includes('search') ||
    query.includes('recommend') ||
    query.includes('suggest') ||
    query.includes('venum') ||
    query.includes('theva') ||
    query.includes('look for') ||
    query.includes('require');

  if (isDiscovery) {
    return { type: 'SERVICE_SEARCH_OR_RECOMMEND' };
  }

  // 9. General out of scope
  return { type: 'GENERAL_OUT_OF_SCOPE' };
}

/**
 * Query live MongoDB data for real-time AI knowledge context.
 */
export async function getLiveKnowledgeContext() {
  let categories = [];
  let providers = [];
  let services = [];

  try {
    categories = await ServiceCategory.find({ status: 'Active' }).lean();
  } catch (err) {
    console.error('AI Context Error (Categories):', err.message);
  }

  try {
    providers = await Provider.find({ status: 'Approved' }).populate('user').lean();
  } catch (err) {
    console.error('AI Context Error (Providers):', err.message);
  }

  try {
    services = await Service.find({ isAvailable: true }).lean();
  } catch (err) {
    console.error('AI Context Error (Services):', err.message);
  }

  // Build genuine provider list with accurate rates and genuine ratings
  const providerList = providers.map(p => {
    const ratingValue = (typeof p.rating === 'number' && p.rating >= 0) ? p.rating : 0;
    let priceString = '';
    let numPrice = 0;
    let pUnit = 'Per Visit';

    if (p.pricing && p.pricing.length > 0 && typeof p.pricing[0].price === 'number') {
      numPrice = p.pricing[0].price;
      pUnit = p.pricing[0].unit || 'Per Visit';
      priceString = `₹${numPrice} ${pUnit}`;
    } else if (p.hourlyRate && p.hourlyRate > 0) {
      numPrice = p.hourlyRate;
      pUnit = 'Per Hour';
      priceString = `₹${numPrice} Per Hour`;
    } else if (p.rate && p.rate > 0) {
      numPrice = p.rate;
      pUnit = p.pricingUnit || 'Per Visit';
      priceString = `₹${numPrice} ${pUnit}`;
    } else {
      priceString = 'Standard Rate';
    }

    return {
      id: p._id.toString(),
      name: p.name || p.user?.fullName || 'Verified Professional',
      email: p.email || p.user?.email || '',
      category: p.category,
      rating: ratingValue,
      reviewsCount: p.reviewsCount || 0,
      price: priceString,
      numericPrice: numPrice,
      pricingUnit: pUnit,
      city: p.city || 'Coimbatore',
      workingHours: p.workingHours || { start: '09:00', end: '18:00' },
      workingDays: p.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      blockedDates: (p.blockedDates || []).map(formatDateDDMMYYYY),
      holidays: (p.holidays || []).map(formatDateDDMMYYYY),
      photo: normalizeImageUrl(p.photo || ''),
      experience: p.experience || 1,
      about: p.about || p.bio || 'Verified service professional in Coimbatore.'
    };
  });

  const categoriesText = categories.length > 0
    ? categories.map(c => `• ${c.name}: ${c.description || 'Residential maintenance'} (Starting ₹${c.startingPrice || 299} ${c.duration || 'Per Visit'})`).join('\n')
    : '• Electrician, Plumber, AC Repair, Home Cleaning, Deep Cleaning, Painter, Carpenter, Beautician, Pest Control, RO Water Purifier, Gardening, Interior Designer';

  const providersText = providerList.length > 0
    ? providerList.map(p => `• ${p.name} | Category: ${p.category} | Rating: ${p.rating}/5 (${p.reviewsCount} reviews) | Price: ${p.price} | Hours: ${p.workingHours.start}–${p.workingHours.end} (${p.workingDays.join(', ')}) | City: ${p.city}`).join('\n')
    : '• No providers currently approved in Coimbatore';

  const servicesText = services.length > 0
    ? services.map(s => `• ${s.name} (${s.category}): ₹${s.price} ${s.pricingUnit || 'Per Visit'}`).join('\n')
    : '';

  return { categories, providers, services, categoriesText, providersText, servicesText, providerList };
}

/**
 * Handles customer-specific booking inquiries with strict privacy and authorization.
 */
export async function handleCustomerBookingsQuery(userMessage, customer, recentHistory = []) {
  const query = (userMessage || '').toLowerCase().trim();

  // Cross-customer privacy protection
  if (query.includes('someone else') || query.includes('other customer') || query.includes('another user') || query.includes('all customer') || query.includes('private')) {
    return {
      reply: `For privacy and data protection, I can only access and display bookings belonging strictly to your verified account (${customer?.email || 'authenticated user'}). Other customer records, bookings, and private contact details cannot be disclosed.`,
      suggestedQuestions: ["Show my active bookings", "How do I book a service?", "Browse Services"]
    };
  }

  // Authentication check
  if (!customer || !customer.email) {
    return {
      reply: "For your security and privacy, I can only display booking details for logged-in customer accounts. Please make sure you are signed in, and you will be able to see all your bookings here or directly under the **Bookings & Saved** tab in the sidebar.",
      suggestedQuestions: ["Which services are available?", "How do I book a service?", "Find an electrician"]
    };
  }

  try {
    const customerBookings = await Booking.find({
      customerEmail: customer.email.toLowerCase().trim()
    }).sort({ createdAt: -1 }).lean();

    if (!customerBookings || customerBookings.length === 0) {
      return {
        reply: `You currently have **no bookings** registered under your account (**${customer.email}**).\n\nTo schedule a new service:\n1. Open **Browse Services** or **Search Providers** in the sidebar.\n2. Choose your preferred service and verified professional.\n3. Pick an appointment date, time slot, and enter your Coimbatore address.\n4. Submit your booking request!`,
        suggestedQuestions: ["Browse Services", "Find an electrician", "Book AC repair in Coimbatore"]
      };
    }

    const bookingLines = customerBookings.map((b, idx) => {
      const formattedDate = formatDateDDMMYYYY(b.date);
      const displayBookingId = (b.bookingId || '').startsWith('#') ? b.bookingId : `#${b.bookingId}`;
      return `**${idx + 1}. Booking ID: ${displayBookingId}**\n• **Service:** ${b.serviceName || b.serviceType}\n• **Provider:** ${b.providerName}\n• **Date & Time:** ${formattedDate} at ${b.time}\n• **Status:** ${b.status}\n• **Amount:** ₹${b.amount}\n• **Location:** ${b.location || customer.city || 'Coimbatore'}`;
    }).join('\n\n');

    return {
      reply: `Here are the current bookings associated with your account (**${customer.email}**):\n\n${bookingLines}\n\n💡 You can manage, reschedule, or cancel bookings under the **Bookings & Saved** section in your portal.`,
      suggestedQuestions: ["How do I reschedule a booking?", "Browse more services", "Find an electrician"]
    };
  } catch (err) {
    console.error('Error fetching customer bookings:', err.message);
    return {
      reply: "I encountered an error retrieving your bookings from the database. Please check your **Bookings & Saved** page in the sidebar.",
      suggestedQuestions: ["Which services are available?", "Find an electrician"]
    };
  }
}

/**
 * Intelligent Grounded Knowledge Engine for SmartServe AI.
 * Strictly uses genuine MongoDB data, answers natural language questions,
 * enforces Coimbatore-only location, handles follow-ups, and prevents hallucinations.
 */
export function generateProjectGroundedResponse(userMessage, contextData, customer = null, history = [], imageInfo = null, docInfo = null) {
  const query = (userMessage || '').toLowerCase().trim();
  const { categories = [], services = [], providerList = [] } = contextData;

  // Active category determination (resolves explicit mentions + historical context)
  const activeCategory = extractActiveCategory(userMessage, history, categories, providerList);
  const intent = detectIntent(userMessage, activeCategory, providerList);

  // 1. UNSUPPORTED SERVICE
  if (intent.type === 'UNSUPPORTED_SERVICE') {
    const activeCatNames = categories.map(c => c.name).join(', ');
    return {
      reply: `SmartServe AI does not offer **${intent.keyword}** services. We specialize exclusively in residential home and appliance maintenance services in Coimbatore.\n\n**Our Active Service Categories:**\n${activeCatNames || 'Electrician, Plumber, AC Repair, Home Cleaning, Deep Cleaning, Painter, Carpenter, Beautician, Pest Control, RO Water Purifier, Gardening, Interior Designer'}.\n\nYou can explore all available services in your portal under **Browse Services**.`,
      card: null,
      suggestedQuestions: ["Which services are available?", "Find an electrician", "Book AC repair in Coimbatore"]
    };
  }

  // 2. DOCUMENT ATTACHMENT
  if (docInfo && docInfo.text) {
    const docSummary = docInfo.text.slice(0, 300);
    const cat = activeCategory || 'Home Maintenance';
    const matchingProv = providerList.find(p => p.category.toLowerCase() === cat.toLowerCase());
    return {
      reply: `I have received and analyzed your attached document (**${docInfo.name}**).\n\n**Extracted Document Summary:**\n"${docSummary}${docInfo.text.length > 300 ? '...' : ''}"\n\nBased on your document and request, SmartServe AI connects you with verified local professionals in Coimbatore for ${cat} requirements. You can browse matching providers or start a booking under **Search Providers**.`,
      card: matchingProv ? {
        title: matchingProv.name,
        category: matchingProv.category,
        rating: matchingProv.rating,
        price: matchingProv.price,
        location: matchingProv.city,
        photo: matchingProv.photo,
        matchReason: `Verified ${matchingProv.category}`,
        providerId: matchingProv.id
      } : null,
      suggestedQuestions: [`Book a ${cat}`, "How much does it cost?", "Browse Services"]
    };
  }

  // 3. IMAGE ATTACHMENT
  if (imageInfo) {
    let detectedCategory = 'Electrician';
    if (query.includes('ac') || query.includes('cool') || query.includes('air condition')) {
      detectedCategory = 'AC Repair';
    } else if (activeCategory) {
      detectedCategory = activeCategory;
    } else if (query.includes('leak') || query.includes('pipe') || query.includes('tap') || query.includes('water')) {
      detectedCategory = 'Plumber';
    } else if (query.includes('paint') || query.includes('wall') || query.includes('colour')) {
      detectedCategory = 'Painter';
    } else if (query.includes('wood') || query.includes('door') || query.includes('furniture')) {
      detectedCategory = 'Carpenter';
    } else if (query.includes('clean') || query.includes('dust') || query.includes('floor')) {
      detectedCategory = 'Home Cleaning';
    }

    const matchedProvider = providerList.find(p => p.category.toLowerCase().includes(detectedCategory.toLowerCase()));
    const matchingService = services.find(s => s.category.toLowerCase().includes(detectedCategory.toLowerCase()));
    const pricingDetail = matchingService
      ? `(e.g., ${matchingService.name} starting at ₹${matchingService.price} ${matchingService.pricingUnit || 'Per Visit'})`
      : '';

    return {
      reply: `I have reviewed your attached image (**${imageInfo.name}**).\n\nFor issues visible in home appliances or fixtures of this type, the recommended service on SmartServe AI is **${detectedCategory}** ${pricingDetail}.\n\n**Next Steps:**\n1. A verified **${detectedCategory}** technician can inspect the issue on-site for an accurate physical assessment.\n2. Certified providers in Coimbatore offer initial inspection and troubleshooting starting from genuine rates.\n3. You can click **Book Now** below or navigate to **Search Providers** to select an appointment slot that fits your schedule.`,
      card: matchedProvider ? {
        title: matchedProvider.name,
        category: matchedProvider.category,
        rating: matchedProvider.rating,
        price: matchedProvider.price,
        location: matchedProvider.city,
        photo: matchedProvider.photo,
        matchReason: `Verified ${matchedProvider.category}`,
        providerId: matchedProvider.id
      } : null,
      suggestedQuestions: [`Book a ${detectedCategory}`, "How much does inspection cost?", "Browse Services"]
    };
  }

  // 4. SPECIFIC PROVIDER NAME SEARCH
  if (intent.type === 'SPECIFIC_PROVIDER_SEARCH' && intent.provider) {
    const prov = intent.provider;
    const ratingDisplay = prov.reviewsCount > 0 ? `${prov.rating}/5.0 (${prov.reviewsCount} reviews)` : `${prov.rating}/5.0 (New Provider)`;
    return {
      reply: `**${prov.name}** is a verified **${prov.category}** on SmartServe AI in Coimbatore.\n\n• **Rating:** ${ratingDisplay}\n• **Experience:** ${prov.experience} years\n• **Pricing:** ${prov.price}\n• **Working Hours:** ${prov.workingHours.start} – ${prov.workingHours.end}\n• **Operating Days:** ${prov.workingDays.join(', ')}\n• **City:** ${prov.city}\n• **About:** ${prov.about}`,
      card: {
        title: prov.name,
        category: prov.category,
        rating: prov.rating,
        price: prov.price,
        location: prov.city,
        photo: prov.photo,
        matchReason: 'Verified Provider Profile',
        providerId: prov.id
      },
      suggestedQuestions: [`Book with ${prov.name}`, `What are ${prov.name}'s working days?`, `Browse other ${prov.category}s`]
    };
  }

  // 5. PRICING INQUIRIES
  if (intent.type === 'PRICING_INQUIRY') {
    if (activeCategory) {
      const catDoc = categories.find(c => c.name.toLowerCase() === activeCategory.toLowerCase());
      const catStartingPrice = catDoc ? `Starts from ₹${catDoc.startingPrice} ${catDoc.duration || 'Per Visit'}` : 'Standard platform pricing';
      const catServices = services.filter(s => s.category.toLowerCase() === activeCategory.toLowerCase());
      const matchingProviders = providerList.filter(p => p.category.toLowerCase() === activeCategory.toLowerCase());

      if (matchingProviders.length === 0) {
        return {
          reply: `SmartServe AI supports **${activeCategory}** services in Coimbatore (${catStartingPrice}). However, there are currently **no verified ${activeCategory} providers registered or available** on the platform to confirm an exact service quote.\n\nPlease check back shortly as new verified professionals are onboarded, or explore our active services such as Electrician, Home Cleaning, or Painter.`,
          card: null,
          suggestedQuestions: ["Which services are available?", "Find an electrician", "Browse Services"]
        };
      }

      // Check if a specific service item was asked (e.g. "fan repair", "ceiling fan", "switchboard", "tap leak")
      let matchedServiceItem = null;
      for (const s of catServices) {
        const sNameLower = s.name.toLowerCase();
        const sWords = sNameLower.split(/[\s,/-]+/).filter(w => w.length >= 3);
        const matchCount = sWords.filter(w => query.includes(w)).length;
        if (matchCount >= 2 || (sWords.length === 1 && matchCount === 1) || query.includes(sNameLower)) {
          matchedServiceItem = {
            name: s.name,
            price: s.price,
            pricingUnit: s.pricingUnit || 'Per Hour',
            providerName: null
          };
          break;
        }
      }

      if (!matchedServiceItem) {
        for (const p of matchingProviders) {
          if (p.pricing && Array.isArray(p.pricing)) {
            for (const item of p.pricing) {
              if (item.service) {
                const itemLower = item.service.toLowerCase();
                const itemWords = itemLower.split(/[\s,/-]+/).filter(w => w.length >= 3);
                if (itemWords.some(w => query.includes(w)) || query.includes(itemLower)) {
                  matchedServiceItem = {
                    name: item.service,
                    price: item.price,
                    pricingUnit: item.unit || p.pricingUnit || 'Per Hour',
                    providerName: p.name
                  };
                  break;
                }
              }
            }
          }
          if (matchedServiceItem) break;
        }
      }

      let specificPriceText = '';
      if (matchedServiceItem) {
        specificPriceText = `\n• **Verified ${matchedServiceItem.name} Rate:** ₹${matchedServiceItem.price} ${matchedServiceItem.pricingUnit}${matchedServiceItem.providerName ? ` (offered by ${matchedServiceItem.providerName})` : ''}`;
      }

      let servicesListText = '';
      if (catServices.length > 0) {
        servicesListText = '\n**Service Packages:**\n' + catServices.slice(0, 4).map(s => `• ${s.name}: ₹${s.price} ${s.pricingUnit || 'Per Visit'}`).join('\n');
      }

      let provRateText = '';
      if (matchingProviders.length > 0) {
        provRateText = '\n**Verified Provider Rates:**\n' + matchingProviders.slice(0, 3).map(p => `• **${p.name}:** ${p.price}`).join('\n');
      }

      const topProvider = matchingProviders[0] || null;

      return {
        reply: `**SmartServe ${activeCategory} Pricing in Coimbatore:**\n\n• **Standard Starting Rate:** ${catStartingPrice}${specificPriceText}${servicesListText}${provRateText}\n\n**Price Policy:** Total payable consists strictly of the applicable provider service fee with zero platform fees, zero convenience charges, and zero hidden markups. You can view complete rate breakdowns or book an appointment under **Search Providers**.`,
        card: topProvider ? {
          title: topProvider.name,
          category: topProvider.category,
          rating: topProvider.rating,
          price: topProvider.price,
          location: topProvider.city,
          photo: topProvider.photo,
          matchReason: `Verified ${activeCategory}`,
          providerId: topProvider.id
        } : null,
        suggestedQuestions: [
          `Book an ${activeCategory}`,
          `Are ${activeCategory}s available today?`,
          "Browse Services"
        ]
      };
    }

    // General pricing overview when no specific category is active
    const priceList = categories.slice(0, 8).map(c => `• **${c.name}:** Starts from ₹${c.startingPrice || 299} ${c.duration || 'Per Visit'}`).join('\n');
    return {
      reply: `Here is the current standard pricing overview for SmartServe AI services in Coimbatore:\n\n${priceList}\n\n**Pricing Units Explained:**\n• **Per Hour:** Billed based on time spent on site (common for Electrician and Carpenter work).\n• **Per Visit:** Fixed inspection or standard service charge.\n• **Per Sq.Ft:** Billed by surface area (Painting and Flooring).\n• **Per BHK:** Package pricing based on home configuration (Cleaning & Pest Control).\n\nFor a customized total estimate, you can also use the **AI Cost Estimator** from your sidebar.`,
      card: null,
      suggestedQuestions: ["How much does electrical work cost?", "How much for plumbing?", "Browse Services"]
    };
  }

  // 6. AVAILABILITY INQUIRIES
  if (intent.type === 'AVAILABILITY_INQUIRY') {
    if (activeCategory) {
      const matchingProviders = providerList.filter(p => p.category.toLowerCase() === activeCategory.toLowerCase());

      if (matchingProviders.length === 0) {
        const catDoc = categories.find(c => c.name.toLowerCase() === activeCategory.toLowerCase());
        const catPrice = catDoc ? `starting from ₹${catDoc.startingPrice} ${catDoc.duration}` : '';
        return {
          reply: `SmartServe AI supports **${activeCategory}** services in Coimbatore ${catPrice}. However, there are currently **no verified ${activeCategory} providers registered or available** on the platform.\n\nPlease check back shortly as new verified professionals are onboarded, or explore our other active categories.`,
          card: null,
          suggestedQuestions: ["Which services are available?", "Find an electrician", "Browse Services"]
        };
      }

      // Check today's working schedule
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayName = daysOfWeek[new Date().getDay()];
      const availableToday = matchingProviders.filter(p => Array.isArray(p.workingDays) && p.workingDays.includes(todayName));

      const topProvider = matchingProviders[0];

      if (availableToday.length > 0) {
        const provLines = availableToday.map(p =>
          `• **${p.name}:** Operating today (${todayName}) from ${p.workingHours.start} to ${p.workingHours.end} | Price: ${p.price}`
        ).join('\n');

        return {
          reply: `**${activeCategory} Availability in Coimbatore (Today - ${todayName}):**\n\nYes! Verified **${activeCategory}** professionals are operating today in Coimbatore:\n${provLines}\n\nYou can book an appointment slot within these working hours directly in your customer portal.`,
          card: {
            title: topProvider.name,
            category: topProvider.category,
            rating: topProvider.rating,
            price: topProvider.price,
            location: topProvider.city,
            photo: topProvider.photo,
            matchReason: 'Available Today',
            providerId: topProvider.id
          },
          suggestedQuestions: [`Book with ${topProvider.name}`, `What about the price?`, "Show my active bookings"]
        };
      } else {
        const provLines = matchingProviders.map(p =>
          `• **${p.name}:** Standard days: ${p.workingDays.join(', ')} (${p.workingHours.start}–${p.workingHours.end})`
        ).join('\n');

        return {
          reply: `None of our approved **${activeCategory}** providers are currently scheduled to work today (${todayName}).\n\n**Standard Provider Schedules in Coimbatore:**\n${provLines}\n\nYou can select an upcoming working day when booking through your portal under **Search Providers**.`,
          card: {
            title: topProvider.name,
            category: topProvider.category,
            rating: topProvider.rating,
            price: topProvider.price,
            location: topProvider.city,
            photo: topProvider.photo,
            matchReason: 'Verified Provider',
            providerId: topProvider.id
          },
          suggestedQuestions: [`Book with ${topProvider.name}`, `What about the price?`, "Browse Services"]
        };
      }
    }

    return {
      reply: `Our verified service providers in Coimbatore generally operate **Monday through Saturday from 08:00 to 18:00**.\n\nWhich service provider's availability would you like to check? For example, ask:\n• "Are electricians available today?"\n• "What are plumber working hours?"`,
      card: null,
      suggestedQuestions: ["Are electricians available today?", "Which services are available?", "Browse Services"]
    };
  }

  // 7. BOOKING INSTRUCTION
  if (intent.type === 'BOOKING_INSTRUCTION') {
    const specifiedProvider = intent.provider || findProviderByName(query, providerList);
    const targetCat = specifiedProvider?.category || activeCategory;

    if (specifiedProvider) {
      return {
        reply: `To schedule an appointment with **${specifiedProvider.name}** (${specifiedProvider.category}):\n\n1. Click the **Book Now** button below or visit **Search Providers** in the sidebar.\n2. Choose your preferred service date (in DD/MM/YYYY format) and a time slot during their working hours (**${specifiedProvider.workingHours.start} – ${specifiedProvider.workingHours.end}**).\n3. Confirm your service address in Coimbatore.\n4. Submit your booking.\n\n*Important:* The AI Assistant cannot automatically confirm a booking; bookings cannot be finalized directly in chat without your chosen date, time, and service location. Please use the button below to complete your booking.`,
        card: {
          title: specifiedProvider.name,
          category: specifiedProvider.category,
          rating: specifiedProvider.rating,
          price: specifiedProvider.price,
          location: specifiedProvider.city,
          photo: specifiedProvider.photo,
          matchReason: 'Ready for Booking',
          providerId: specifiedProvider.id
        },
        suggestedQuestions: [`View ${specifiedProvider.name}'s profile`, "Show my active bookings", "Browse all providers"]
      };
    }

    if (targetCat) {
      const matchingProviders = providerList.filter(p => p.category.toLowerCase() === targetCat.toLowerCase());

      if (matchingProviders.length === 0) {
        const catDoc = categories.find(c => c.name.toLowerCase() === targetCat.toLowerCase());
        const catPrice = catDoc ? ` (starting from ₹${catDoc.startingPrice} ${catDoc.duration})` : '';
        return {
          reply: `SmartServe AI offers **${targetCat}** services in Coimbatore${catPrice}. However, there are currently **no verified ${targetCat} providers registered or available** on the platform to accept bookings.\n\nYou can check back shortly or explore our other available services such as Electrician, Home Cleaning, or Painter.`,
          card: null,
          suggestedQuestions: ["Which services are available?", "Find an electrician", "Browse Services"]
        };
      }

      const topProvider = matchingProviders[0];
      return {
        reply: `**How to Book a Verified ${targetCat} in Coimbatore:**\n\n1. **Select Provider:** Click the **Book Now** button on the card below or navigate to **Search Providers** in the sidebar.\n2. **Choose Appointment Slot:** Pick a service date (in DD/MM/YYYY format) and a preferred time slot during operating hours (${topProvider.workingHours.start}–${topProvider.workingHours.end}).\n3. **Enter Service Address:** Provide your genuine address within Coimbatore.\n4. **Submit Booking:** Confirm the request to register your appointment directly.\n\n*Important:* The AI Assistant cannot automatically confirm a booking; bookings cannot be finalized directly in chat without selecting an appointment slot and address. Please use the **Book Now** button below or visit **Search Providers**.`,
        card: {
          title: topProvider.name,
          category: topProvider.category,
          rating: topProvider.rating,
          price: topProvider.price,
          location: topProvider.city,
          photo: topProvider.photo,
          matchReason: 'Ready for Booking',
          providerId: topProvider.id
        },
        suggestedQuestions: [
          `What are ${topProvider.name}'s working hours?`,
          "What about the price?",
          "Show my active bookings"
        ]
      };
    }

    return {
      reply: `Booking a service on SmartServe AI is quick and easy:\n\n1. **Browse or Search:** Click **Browse Services** or **Search Providers** in your customer portal.\n2. **Choose a Professional:** Review provider ratings, customer reviews, hourly rates, and working hours.\n3. **Select Slot:** Choose an available date (DD/MM/YYYY) and time within the provider's operating hours.\n4. **Address & Confirmation:** Enter your service address in Coimbatore and submit.\n5. **Track:** Check status anytime under **Bookings & Saved** in the sidebar.`,
      card: null,
      suggestedQuestions: ["Find an electrician", "Browse Services", "Show my active bookings"]
    };
  }

  // 8. SERVICE SEARCH OR RECOMMENDATION
  if (intent.type === 'SERVICE_SEARCH_OR_RECOMMEND' && activeCategory) {
    const catDoc = categories.find(c => c.name.toLowerCase() === activeCategory.toLowerCase());
    const matchingProviders = providerList.filter(p => p.category.toLowerCase() === activeCategory.toLowerCase());
    const matchingServices = services.filter(s => s.category.toLowerCase() === activeCategory.toLowerCase());

    if (matchingProviders.length === 0) {
      const priceText = catDoc ? ` (starting from ₹${catDoc.startingPrice} ${catDoc.duration || 'Per Visit'})` : '';
      return {
        reply: `SmartServe AI offers **${activeCategory}** services in Coimbatore${priceText}.\n\nHowever, there are currently **no verified ${activeCategory} providers registered or available** on the platform.\n\nYou can check back shortly as new verified professionals are onboarded, or explore our other available services such as Electrician, Home Cleaning, or Painter.`,
        card: null,
        suggestedQuestions: ["Which services are available?", "Find an electrician", "Browse Services"]
      };
    }

    const topProvider = matchingProviders[0];

    const providerLines = matchingProviders.map(p => {
      const ratingStr = p.reviewsCount > 0 ? `${p.rating}/5.0 (${p.reviewsCount} reviews)` : `${p.rating}/5.0 (New Provider)`;
      return `• **${p.name}** — Rating: ${ratingStr} | Price: ${p.price} | Hours: ${p.workingHours.start}–${p.workingHours.end} (${p.workingDays.join(', ')})`;
    }).join('\n');

    let servicesListText = '';
    if (matchingServices.length > 0) {
      servicesListText = '\n\n**Available Service Packages:**\n' + matchingServices.slice(0, 4).map(s =>
        `• ${s.name}: ₹${s.price} ${s.pricingUnit || 'Per Visit'}`
      ).join('\n');
    }

    return {
      reply: `**SmartServe ${activeCategory} Services in Coimbatore**\n\n${catDoc?.description || 'Verified on-demand residential maintenance in Coimbatore.'}\n• **Starting Price:** Starts from ₹${catDoc?.startingPrice || 299} ${catDoc?.duration || 'Per Visit'}${servicesListText}\n\n**Verified Providers in Coimbatore:**\n${providerLines}\n\nWould you like to book an appointment with a verified ${activeCategory} or check their availability?`,
      card: {
        title: topProvider.name,
        category: topProvider.category,
        rating: topProvider.rating,
        price: topProvider.price,
        location: topProvider.city,
        photo: topProvider.photo,
        matchReason: `Verified ${activeCategory}`,
        providerId: topProvider.id
      },
      suggestedQuestions: [
        `How much does ${activeCategory} work cost?`,
        `Are ${activeCategory}s available today?`,
        `How do I book?`
      ]
    };
  }

  // 9. AMBIGUOUS QUERY
  if (intent.type === 'AMBIGUOUS_QUERY') {
    return {
      reply: `I would be glad to help! Could you please specify which service you need? For example, are you looking for an **Electrician**, **Plumber**, **AC Repair**, **Carpenter**, **Painter**, or **Home Cleaning** in Coimbatore?`,
      card: null,
      suggestedQuestions: ["I need an electrician", "I need a plumber", "My AC is not cooling", "Book a cleaner"]
    };
  }

  // 10. GENERAL OUT OF SCOPE / DEFAULT
  const catNames = categories.map(c => c.name).join(', ');
  return {
    reply: `I am your SmartServe AI Assistant, dedicated exclusively to residential home and appliance maintenance services in Coimbatore.\n\nI can help you:\n• Search verified providers and check real ratings, working hours, and pricing\n• Discover available service categories (${catNames || 'Electrician, Plumber, AC Repair, Cleaning, Painter, Carpenter'})\n• View and check the status of your bookings\n• Guide you through the booking process\n\nHow may I help you with your home services today?`,
    card: null,
    suggestedQuestions: [
      "Which services are available?",
      "Find an electrician",
      "Show my active bookings",
      "How do I book a service?"
    ]
  };
}

/**
 * Validates AI response from Gemini against verified database context.
 * Rejects hallucinations, fabricated providers, out-of-scope services, and fake bookings.
 */
export function validateAiResponse(geminiReply, groundedResult, contextData, activeCategory = null) {
  if (!geminiReply || typeof geminiReply !== 'string' || !geminiReply.trim()) {
    return { valid: false, sanitizedReply: groundedResult.reply };
  }

  const replyLower = geminiReply.toLowerCase();

  // 1. Check for hallucinated out-of-scope services
  const unsupportedKeywords = [
    'helicopter', 'airplane', 'aeroplane', 'yacht', 'submarine', 'spaceship',
    'brain surgery', 'plastic surgery', 'dental surgery', 'hospital stay',
    'car repair', 'car wash', 'bike service', 'pet grooming',
    'catering service', 'chef hire', 'crypto trading', 'stock investment'
  ];
  for (const uk of unsupportedKeywords) {
    if (replyLower.includes(uk)) {
      return { valid: false, sanitizedReply: groundedResult.reply };
    }
  }

  // 2. Check for false booking confirmations
  if (replyLower.includes('booking has been confirmed') || replyLower.includes('booking is confirmed') || replyLower.includes('successfully booked your appointment')) {
    return { valid: false, sanitizedReply: groundedResult.reply };
  }

  // 3. Category relevance check:
  // If user requested Electrician, ensure reply doesn't solely push an unrelated category like Interior Designer or Cleaning
  if (activeCategory) {
    const actLower = activeCategory.toLowerCase();
    const isRelated = replyLower.includes(actLower) ||
      (actLower === 'electrician' && (replyLower.includes('electric') || replyLower.includes('wiring') || replyLower.includes('switch') || replyLower.includes('fan'))) ||
      (actLower === 'plumber' && (replyLower.includes('plumb') || replyLower.includes('pipe') || replyLower.includes('leak') || replyLower.includes('tap'))) ||
      (actLower === 'carpenter' && (replyLower.includes('carpenter') || replyLower.includes('wood') || replyLower.includes('furniture'))) ||
      (actLower === 'painter' && (replyLower.includes('paint') || replyLower.includes('wall'))) ||
      (actLower === 'ac repair' && (replyLower.includes('ac') || replyLower.includes('cool') || replyLower.includes('air condition'))) ||
      (actLower === 'home cleaning' && (replyLower.includes('clean') || replyLower.includes('maid')));

    if (!isRelated && (replyLower.includes('interior design') || replyLower.includes('cleaning') || replyLower.includes('gardening'))) {
      return { valid: false, sanitizedReply: groundedResult.reply };
    }
  }

  return { valid: true, sanitizedReply: geminiReply.trim() };
}

/**
 * Call Google Gemini API (when GEMINI_API_KEY is configured).
 */
async function callGeminiAPI(apiKey, userMessage, contextData, customer, history, imageInfo, docInfo) {
  const { categoriesText, providersText, servicesText } = contextData;

  const systemInstruction = `You are SmartServe AI, the dedicated customer assistant for the SmartServe AI home services platform in Coimbatore, Tamil Nadu, India.

PLATFORM CONSTRAINTS:
- Location is strictly restricted to Coimbatore, Tamil Nadu.
- Currency is strictly Indian Rupees (₹).
- Date format is strictly DD/MM/YYYY.
- You must NEVER hallucinate or fabricate service providers, ratings, prices, bookings, or working hours.
- Only reference the actual database knowledge provided below.
- Never claim that a booking has been confirmed or created from chat alone.
- Never disclose another customer's bookings, phone number, address, or email.
- If asked about topics outside home services in Coimbatore, politely decline and steer the customer back to SmartServe services.

LIVE DATABASE KNOWLEDGE:
Categories:
${categoriesText}

Approved Registered Providers in Coimbatore:
${providersText}

Active Services:
${servicesText}

CUSTOMER CONTEXT:
${customer && customer.email ? `Logged-in Customer: ${customer.fullName || 'Customer'} (${customer.email}), Location: ${customer.city || 'Coimbatore'}` : 'Guest / Unauthenticated User'}`;

  const contents = [];

  if (Array.isArray(history) && history.length > 0) {
    for (const item of history.slice(-6)) {
      if (item.sender === 'user' && item.text) {
        contents.push({ role: 'user', parts: [{ text: item.text }] });
      } else if (item.sender === 'ai' && item.text) {
        contents.push({ role: 'model', parts: [{ text: item.text }] });
      }
    }
  }

  const currentParts = [];

  if (imageInfo && imageInfo.data && imageInfo.mimeType) {
    currentParts.push({
      inlineData: {
        mimeType: imageInfo.mimeType,
        data: imageInfo.data
      }
    });
  }

  let textPayload = (userMessage || '').trim();
  if (docInfo && docInfo.text) {
    textPayload = `[ATTACHED DOCUMENT: ${docInfo.name}]\n${docInfo.text}\n\n[USER QUESTION]: ${textPayload || 'Please review this document and assist me with relevant SmartServe services.'}`;
  }

  currentParts.push({ text: textPayload || 'Please assist me with this request.' });
  contents.push({ role: 'user', parts: currentParts });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: contents,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 800
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply && reply.trim()) {
        return {
          success: true,
          reply: reply.trim(),
          source: 'gemini'
        };
      }
    } else {
      const errText = await res.text();
      console.warn('Gemini API returned error status:', res.status, errText);
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('Gemini API call failed:', err.message);
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT: POST /api/ai/chat
// ─────────────────────────────────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  try {
    const { message, history = [], customer = null, image, document: docAttachment } = req.body;

    // 1. Validation
    if ((!message || !message.trim()) && !image && !docAttachment) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a message or attach an image/document.'
      });
    }

    const trimmedMsg = (message || '').trim();

    // 2. Process image attachment (if any)
    let validatedImage = null;
    if (image) {
      const allowedImageMimes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!image.mimeType || !allowedImageMimes.includes(image.mimeType.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: `Unsupported image format (${image.mimeType || 'unknown'}). Supported formats: JPEG, PNG, WebP.`
        });
      }
      if (image.data && image.data.length > 5 * 1024 * 1024 * 1.37) {
        return res.status(400).json({
          success: false,
          message: 'Image size exceeds maximum permitted limit of 5MB.'
        });
      }
      validatedImage = {
        name: image.name || 'uploaded_image.png',
        mimeType: image.mimeType.toLowerCase(),
        data: image.data,
        size: image.size || 0
      };
    }

    // 3. Process document attachment (if any)
    let validatedDoc = null;
    if (docAttachment) {
      const parseResult = await parseDocumentAttachment(docAttachment);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: parseResult.error || 'Failed to process attached document.'
        });
      }
      validatedDoc = {
        name: docAttachment.name || 'document.txt',
        mimeType: docAttachment.mimeType || 'text/plain',
        text: parseResult.text,
        size: docAttachment.size || 0
      };
    }

    // 4. Load Live MongoDB Knowledge Context
    const contextData = await getLiveKnowledgeContext();

    // 5. Check if inquiry is regarding customer's own bookings
    const activeCat = extractActiveCategory(trimmedMsg, history, contextData.categories, contextData.providerList);
    const intent = detectIntent(trimmedMsg, activeCat, contextData.providerList);

    if (intent.type === 'CUSTOMER_BOOKINGS') {
      const bookingsResult = await handleCustomerBookingsQuery(trimmedMsg, customer, history);
      if (bookingsResult) {
        if (customer && customer.email) {
          await saveChatToDatabase(customer.email, trimmedMsg, bookingsResult.reply, validatedImage, validatedDoc, null);
        }
        return res.status(200).json({
          success: true,
          reply: bookingsResult.reply,
          card: null,
          suggestedQuestions: bookingsResult.suggestedQuestions,
          engine: 'smartserve_database'
        });
      }
    }

    // 6. Generate Grounded Response from verified DB data
    const groundedResult = generateProjectGroundedResponse(
      trimmedMsg,
      contextData,
      customer,
      history,
      validatedImage,
      validatedDoc
    );

    // 7. Check for Gemini API Key in environment
    const apiKey = process.env.GEMINI_API_KEY;
    let aiResponse = null;

    if (apiKey && apiKey.trim()) {
      aiResponse = await callGeminiAPI(apiKey, trimmedMsg, contextData, customer, history, validatedImage, validatedDoc);
    }

    // 8. Handle Gemini response with strict backend validation
    if (aiResponse && aiResponse.reply) {
      const validation = validateAiResponse(aiResponse.reply, groundedResult, contextData, activeCat);
      const finalReply = validation.valid ? validation.sanitizedReply : groundedResult.reply;

      if (customer && customer.email) {
        await saveChatToDatabase(customer.email, trimmedMsg, finalReply, validatedImage, validatedDoc, groundedResult.card);
      }

      return res.status(200).json({
        success: true,
        reply: finalReply,
        card: groundedResult.card || null,
        suggestedQuestions: groundedResult.suggestedQuestions || [
          "Which services are available?",
          "How do I book a service?",
          "Find an electrician"
        ],
        engine: validation.valid ? 'gemini_multimodal' : 'grounded_database_fallback'
      });
    }

    // 9. Grounded Knowledge Engine Response (When Gemini key missing or network fails)
    if (customer && customer.email) {
      await saveChatToDatabase(customer.email, trimmedMsg, groundedResult.reply, validatedImage, validatedDoc, groundedResult.card);
    }

    return res.status(200).json({
      success: true,
      reply: groundedResult.reply,
      card: groundedResult.card || null,
      suggestedQuestions: groundedResult.suggestedQuestions,
      engine: 'grounded_database'
    });

  } catch (error) {
    console.error('Error in /api/ai/chat endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while processing your query. Please try again.',
      reply: "I am having temporary difficulty processing your request. Please try again in a moment or visit Browse Services directly."
    });
  }
});

/**
 * Helper to save chat turns to MongoDB.
 */
async function saveChatToDatabase(customerEmail, userText, aiReply, imageInfo, docInfo, card) {
  try {
    const email = customerEmail.toLowerCase().trim();
    let conversation = await ChatConversation.findOne({ customerEmail: email });
    if (!conversation) {
      conversation = new ChatConversation({
        customerEmail: email,
        title: 'SmartServe AI Chat',
        messages: []
      });
    }

    const attachments = [];
    if (imageInfo) {
      attachments.push({
        type: 'image',
        name: imageInfo.name,
        mimeType: imageInfo.mimeType,
        size: imageInfo.size
      });
    }
    if (docInfo) {
      attachments.push({
        type: 'file',
        name: docInfo.name,
        mimeType: docInfo.mimeType,
        size: docInfo.size
      });
    }

    conversation.messages.push({
      id: 'msg_u_' + Date.now(),
      sender: 'user',
      text: userText,
      attachments: attachments,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    conversation.messages.push({
      id: 'msg_a_' + (Date.now() + 1),
      sender: 'ai',
      text: aiReply,
      card: card || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    if (conversation.messages.length > 50) {
      conversation.messages = conversation.messages.slice(-50);
    }

    conversation.lastActivity = new Date();
    await conversation.save();
  } catch (err) {
    console.warn('Failed to persist chat conversation in MongoDB:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT: GET /api/ai/history/:email
// ─────────────────────────────────────────────────────────────────────────────
router.get('/history/:email', async (req, res) => {
  try {
    const email = req.params.email?.toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ success: false, message: 'Customer email is required.' });
    }

    const conversation = await ChatConversation.findOne({ customerEmail: email }).lean();
    return res.status(200).json({
      success: true,
      messages: conversation?.messages || []
    });
  } catch (err) {
    console.error('Error fetching chat history:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch conversation history.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT: DELETE /api/ai/history/:email
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/history/:email', async (req, res) => {
  try {
    const email = req.params.email?.toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ success: false, message: 'Customer email is required.' });
    }

    await ChatConversation.deleteOne({ customerEmail: email });
    return res.status(200).json({
      success: true,
      message: 'Chat history cleared successfully.'
    });
  } catch (err) {
    console.error('Error clearing chat history:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to clear chat history.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AI SERVICE PLANNER IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────────────────

export const PLANNER_SERVICE_PRIORITY = {
  'Interior Designer': 1,
  'CCTV Installation': 2,
  'Carpenter': 3,
  'Electrician': 4,
  'Plumber': 5,
  'AC Repair': 6,
  'Painter': 7,
  'RO Water Purifier': 8,
  'Gardening': 9,
  'Beautician': 10,
  'Pest Control': 11,
  'Home Cleaning': 12,
  'Deep Cleaning': 13
};

export const PLANNER_ORDER_REASONS = {
  'Interior Designer': 'Initial space layout, blueprint planning, and design coordination before physical construction.',
  'CCTV Installation': 'Early security cabling, conduit routing, and network line placement.',
  'Carpenter': 'Structural woodwork, door/window frame adjustments, and cabinetry fixtures prior to wiring & finishes.',
  'Electrician': 'Electrical conduit rough-in, switchboard installation, and wiring setups before walls are prepped and painted.',
  'Plumber': 'Pipe repairs, sanitary fittings, and leak fixing before wall priming and floor treatments.',
  'AC Repair': 'AC ducting, gas checks, and wall unit servicing while workspaces are open.',
  'Painter': 'Wall putty, primer, and top coats applied after all cutting, drilling, and pipe/conduit work is completed.',
  'RO Water Purifier': 'Water purifier installation and filter checks once plumbing line pressure is finalized.',
  'Gardening': 'Outdoor landscaping, lawn trimming, and plant care once heavy trades have exited the property.',
  'Beautician': 'Personal wellness and grooming services scheduled once home projects are settled.',
  'Pest Control': 'Comprehensive anti-termite and pest treatment applied before final deep sanitization.',
  'Home Cleaning': 'General home cleaning and dusting following pest control application.',
  'Deep Cleaning': 'Final comprehensive post-renovation cleanup, debris removal, and floor sanitization to leave the home spotless.'
};

/**
 * Extracts all matched categories in a given user text using category taxonomy and DB active categories.
 */
export function findAllCategoriesInText(text, categories = []) {
  if (!text || typeof text !== 'string') return [];
  const clean = text.toLowerCase().trim();
  const matched = new Set();

  // Sort aliases by descending length
  const allAliases = [];
  for (const def of CATEGORY_DEFINITIONS) {
    for (const alias of def.aliases) {
      allAliases.push({ alias, categoryName: def.name });
    }
  }
  allAliases.sort((a, b) => b.alias.length - a.alias.length);

  for (const item of allAliases) {
    const aliasBase = item.alias;
    const aliasPlural = aliasBase.endsWith('s') ? aliasBase.slice(0, -1) : aliasBase + 's';
    const pattern = new RegExp(`(?:^|[^a-z0-9])(?:${escapeRegex(aliasBase)}|${escapeRegex(aliasPlural)})(?:$|[^a-z0-9])`, 'i');
    if (pattern.test(clean)) {
      matched.add(item.categoryName);
    }
  }

  // Also check database active categories
  for (const cat of categories) {
    const catNameLower = cat.name.toLowerCase();
    const catPlural = catNameLower.endsWith('s') ? catNameLower.slice(0, -1) : catNameLower + 's';
    const pattern = new RegExp(`(?:^|[^a-z0-9])(?:${escapeRegex(catNameLower)}|${escapeRegex(catPlural)})(?:$|[^a-z0-9])`, 'i');
    if (pattern.test(clean)) {
      matched.add(cat.name);
    }
  }

  return Array.from(matched);
}

/**
 * Standard scope descriptions for planning output
 */
export const PLANNER_SCOPE_DESCRIPTIONS = {
  'Electrician': 'Comprehensive electrical inspection, wiring diagnostics, switchboard repair, MCB testing, and appliance/fan installation.',
  'Plumber': 'Pipe leak detection, tap replacement, drainage inspection, water line connection, and sanitary fixture fitting.',
  'Carpenter': 'Woodwork repairs, hinge and latch alignment, modular furniture assembly, cot/cabinet restoration, and door fitting.',
  'Painter': 'Surface wall preparation, primer application, putty touch-ups, and interior/exterior wall painting.',
  'AC Repair': 'Cooling diagnostics, air filter cleaning, refrigerant gas check, thermostat testing, and indoor/outdoor unit servicing.',
  'Home Cleaning': 'General room dusting, floor sweeping, wet mopping, surface wipedown, and trash removal.',
  'Deep Cleaning': 'Intensive sanitization, bathroom descaling, kitchen grease removal, and floor machine scrubbing.',
  'Pest Control': 'Targeted insect, termite, cockroach, and pest eradication treatment with safety-approved chemical agents.',
  'RO Water Purifier': 'Filter cartridge replacement, membrane inspection, TDS level testing, and water leakage repair.',
  'Refrigerator Repair': 'Compressor diagnostics, thermostat adjustment, gas leak check, and defrost system repair.',
  'Washing Machine Repair': 'Motor testing, drum alignment, drain pump unclogging, and spin cycle troubleshooting.',
  'CCTV Installation': 'Camera mounting, DVR configuration, network wiring, and mobile monitoring integration.'
};

/**
 * Relevant required details for accurate planning and estimates
 */
export const PLANNER_REQUIRED_DETAILS = {
  'Electrician': 'Confirm if replacement switches, fixtures, or ceiling fans are on site, and ensure safe access to the main circuit breaker.',
  'Plumber': 'Confirm access to the main water shutoff valve and identify piping material (PVC, CPVC, or metal).',
  'Carpenter': 'Specify furniture dimensions, hardware accessories needed (hinges, latches, locks), and preferred wood material.',
  'Painter': 'Specify paint finish preference (emulsion, distemper, or enamel) and whether wall putty or primer is required.',
  'AC Repair': 'Confirm AC brand, tonnage (e.g., 1.5 Ton), unit type (split vs window), and describe specific symptoms (cooling loss or water dripping).',
  'Home Cleaning': 'Verify whether property is occupied or vacant and ensure uninterrupted water and electricity supply.',
  'Deep Cleaning': 'Indicate specific areas requiring heavy treatment (kitchen grease, bathroom hard water stains, sofa upholstery) and room square footage.',
  'Pest Control': 'Specify affected areas and confirm absence of infants, pets, or food items during chemical application.',
  'RO Water Purifier': 'Specify purifier brand and age of existing sediment and carbon filter cartridges.'
};

/**
 * End-to-end AI Service Plan Generator grounded strictly in MongoDB database.
 */
export async function generateAIServicePlan({
  query,
  message,
  services,
  workDescription,
  location,
  rooms,
  quantity,
  history = [],
  customer = null
} = {}) {
  const inputMessage = (query || message || workDescription || '').trim();

  // Location validation: enforce Coimbatore only
  const unsupportedCities = ['chennai', 'bangalore', 'bengaluru', 'mumbai', 'delhi', 'hyderabad', 'kolkata', 'kochi', 'madurai', 'salem', 'trichy', 'tirupur', 'erode'];
  const fullText = `${inputMessage} ${location || ''}`.toLowerCase();
  for (const city of unsupportedCities) {
    if (fullText.includes(city)) {
      return {
        success: false,
        supported: false,
        message: `SmartServe AI service planning and verified providers are currently available only within Coimbatore, Tamil Nadu. Selected location "${city}" is outside our operating region.`
      };
    }
  }

  // Retrieve active categories from MongoDB
  const activeCategories = await ServiceCategory.find({ status: 'Active' }).lean();

  // Retrieve approved providers from MongoDB
  const allApprovedProviders = await Provider.find({ status: 'Approved' }).populate('user').lean();
  const validApprovedProviders = allApprovedProviders.filter(p => p.user);

  // Check if query is targeting a specific provider by name
  let preferredProvider = null;
  if (inputMessage) {
    const matchedProv = findProviderByName(inputMessage, validApprovedProviders);
    if (matchedProv) {
      preferredProvider = matchedProv;
    }
  }

  // Identify categories from inputs
  let selectedCategories = new Set();

  if (Array.isArray(services) && services.length > 0) {
    services.forEach(s => {
      const match = activeCategories.find(c => c.name.toLowerCase() === s.toLowerCase());
      if (match) selectedCategories.add(match.name);
      else selectedCategories.add(s);
    });
  }

  const isPriceQuery = /how much|cost|price|rate|charge|fee|budget|evlo|vila/i.test(inputMessage);
  const isDurationQuery = /duration|how long|time|hours?|days?|neram/i.test(inputMessage);
  const isBookingQuery = /can i book|how to book|book|booking|hire|schedule|appointment/i.test(inputMessage);
  const isFollowUp = isPriceQuery || isDurationQuery || isBookingQuery;

  if (preferredProvider) {
    // If specific provider named, focus on their category
    selectedCategories = new Set([preferredProvider.category]);
  } else if (inputMessage) {
    const fromText = findAllCategoriesInText(inputMessage, activeCategories);
    if (fromText.length > 0) {
      // If user specified conjunction (and/both/with/also/multiple categories), retain all
      const isMulti = fromText.length > 1 || /and|both|with|also|as well|\+/i.test(inputMessage);
      if (isMulti) {
        fromText.forEach(c => selectedCategories.add(c));
      } else {
        // Explicitly requested a single category (context switch from previous service)
        selectedCategories = new Set(fromText);
      }
    } else if (isFollowUp) {
      // Follow-up inquiry: pull active category from history if selectedCategories is empty
      if (Array.isArray(history) && history.length > 0) {
        const lastUserTurn = inputMessage.toLowerCase();
        if (lastUserTurn.includes('remove') || lastUserTurn.includes('delete') || lastUserTurn.includes('cancel') || lastUserTurn.includes('drop')) {
          for (const cat of activeCategories) {
            if (lastUserTurn.includes(cat.name.toLowerCase())) {
              selectedCategories.delete(cat.name);
            }
          }
        }
        if (selectedCategories.size === 0 && !lastUserTurn.includes('clear') && !lastUserTurn.includes('reset')) {
          for (let i = history.length - 1; i >= 0; i--) {
            const item = history[i];
            const hCats = findAllCategoriesInText(item.text || item.message || '', activeCategories);
            if (hCats.length > 0) {
              hCats.forEach(c => selectedCategories.add(c));
              break;
            }
          }
        }
      }
    } else {
      // Direct search query that did not match any supported categories or providers in Coimbatore
      selectedCategories.clear();
    }
  }

  // Parse room count
  let parsedRooms = null;
  if (rooms !== undefined && rooms !== null && rooms !== '') {
    const r = Number(rooms);
    if (Number.isInteger(r) && r >= 1 && r <= 20) {
      parsedRooms = r;
    }
  }
  if (!parsedRooms && inputMessage) {
    const roomMatch = inputMessage.match(/(\d+)\s*(?:rooms?|bhk|bed|beds|bedroom|bedrooms)/i);
    if (roomMatch) {
      const r = parseInt(roomMatch[1], 10);
      if (r >= 1 && r <= 20) parsedRooms = r;
    }
  }
  // Default rooms = 3 for multi-room planning
  const effectiveRooms = parsedRooms || 3;

  // If no categories were identified
  if (selectedCategories.size === 0) {
    const isVague = !inputMessage || /help|renovation|renovate|service|work|project|maintenance|repair|some work/i.test(inputMessage);
    if (isVague) {
      return {
        success: true,
        clarificationNeeded: true,
        reply: "I'd be glad to help coordinate your project in Coimbatore! To design your sequence timeline and cost forecast, please let me know which services you require (for example: Electrician, Plumber, Painter, Carpenter, AC Repair, or Deep Cleaning).",
        suggestedCategories: activeCategories.map(c => c.name),
        steps: [],
        totalDuration: '0 Days',
        totalBudget: 0
      };
    }

    // Unmatched search query (e.g. astronaut, spaceship, car mechanic)
    return {
      success: true,
      noMatches: true,
      found: false,
      message: `No matching services or providers found for "${inputMessage}" in Coimbatore. Try searching for electrician, plumber, carpenter, painter, AC repair, or cleaning.`,
      searchQuery: inputMessage,
      plan: {
        understanding: `No active services or approved providers match your search "${inputMessage}".`,
        recommendedService: "None available",
        requiredDetails: "Please enter a supported home service category in Coimbatore (e.g., Electrician, Plumber, Painter, Carpenter, AC Repair, Cleaning).",
        suggestedWorkPlan: [],
        matchingProviders: [],
        estimatedCost: 0,
        estimatedDuration: "Duration unavailable",
        nextStep: "Try searching for a supported service or select categories from the list on the left.",
        steps: [],
        totalDuration: '0 Days',
        totalBudget: 0,
        rooms: effectiveRooms,
        selectedServices: []
      },
      reply: `No matching services or providers found for "${inputMessage}" in Coimbatore.`
    };
  }

  const categoryList = Array.from(selectedCategories);

  // Fetch approved providers and services for each category from MongoDB
  const rawSteps = [];
  const allMatchingProviders = [];
  const addedProviderIds = new Set();

  for (const catName of categoryList) {
    const catDoc = activeCategories.find(c => c.name.toLowerCase() === catName.toLowerCase()) || null;

    // Filter approved providers for this category
    const catApproved = validApprovedProviders.filter(p =>
      (p.category || '').toLowerCase() === catName.toLowerCase() &&
      (!p.city || p.city.toLowerCase().includes('coimbatore'))
    );

    // Deduplicate providers by stable _id
    const seenIds = new Set();
    const uniqueApproved = [];
    for (const p of catApproved) {
      const pId = String(p._id);
      if (!seenIds.has(pId)) {
        seenIds.add(pId);
        uniqueApproved.push(p);
      }
    }

    if (uniqueApproved.length === 0) {
      // Honest explanation: no approved providers in DB
      rawSteps.push({
        category: catName,
        serviceName: `${catName} Service`,
        provider: null,
        available: false,
        optimalOrderReason: PLANNER_ORDER_REASONS[catName] || 'Standard service phase.',
        schedule: 'Provider Unavailable',
        duration: 'Duration not available',
        estimatedCost: 0,
        breakdown: { providerServiceFee: 0, total: 0 },
        recommendedProviders: [],
        note: `Currently, no approved ${catName} providers are registered in Coimbatore.`
      });
      continue;
    }

    // Sort providers: if preferredProvider matches this category, prioritize it!
    uniqueApproved.sort((a, b) => {
      if (preferredProvider) {
        if (String(a._id) === String(preferredProvider._id)) return -1;
        if (String(b._id) === String(preferredProvider._id)) return 1;
      }
      return (b.rating || 0) - (a.rating || 0) || (b.reviewsCount || 0) - (a.reviewsCount || 0);
    });

    const targetProvider = uniqueApproved[0];

    // Find authentic service records for target provider
    const provServices = await Service.find({
      providerId: targetProvider._id,
      isAvailable: true
    }).lean();

    const targetService = provServices.find(s => (s.category || '').toLowerCase() === catName.toLowerCase()) || provServices[0] || null;

    // Determine unit rate & pricing unit
    let unitRate = 0;
    let unit = catDoc?.duration || 'Per Visit';
    let serviceTitle = targetService?.name || `${catName} Service`;

    if (targetService && typeof targetService.price === 'number') {
      unitRate = targetService.price;
      unit = targetService.pricingUnit || targetProvider.pricingUnit || catDoc?.duration || 'Per Visit';
    } else if (targetProvider.pricing && Array.isArray(targetProvider.pricing) && targetProvider.pricing.length > 0) {
      const p0 = targetProvider.pricing[0];
      if (typeof p0.price === 'number') {
        unitRate = p0.price;
        unit = p0.unit || targetProvider.pricingUnit || catDoc?.duration || 'Per Visit';
        if (p0.service) serviceTitle = p0.service;
      }
    }

    if (!unitRate) {
      if (typeof targetProvider.hourlyRate === 'number' && targetProvider.hourlyRate > 0) {
        unitRate = targetProvider.hourlyRate;
        unit = 'Per Hour';
      } else if (typeof targetProvider.rate === 'number' && targetProvider.rate > 0) {
        unitRate = targetProvider.rate;
        unit = targetProvider.pricingUnit || catDoc?.duration || 'Per Visit';
      } else if (catDoc && typeof catDoc.startingPrice === 'number') {
        unitRate = catDoc.startingPrice;
        unit = catDoc.duration || 'Per Visit';
      } else {
        unitRate = 500;
      }
    }

    // Calculate fee strictly according to verified pricing rules and room count
    let calculatedFee = 0;
    const normUnit = unit.toLowerCase();
    if (normUnit.includes('hour')) {
      const hours = Math.max(1, Math.min(8, Math.round(effectiveRooms * 0.75)));
      calculatedFee = Math.round(unitRate * hours);
    } else if (normUnit.includes('sq.ft') || normUnit.includes('sqft')) {
      const area = effectiveRooms * 400;
      calculatedFee = Math.round(unitRate * area);
    } else if (normUnit.includes('bhk')) {
      const multiplier = effectiveRooms <= 1 ? 1.0 : effectiveRooms === 2 ? 1.4 : effectiveRooms === 3 ? 1.9 : 2.4;
      calculatedFee = Math.round(unitRate * multiplier);
    } else {
      calculatedFee = Math.round(unitRate);
    }

    // Authentic duration from provider's configured service record
    let resolvedDuration = '';
    if (targetService && targetService.estimatedDuration && targetService.estimatedDuration.trim()) {
      resolvedDuration = targetService.estimatedDuration.trim();
    } else if (targetProvider.pricing && targetProvider.pricing.length > 0 && targetProvider.pricing[0].duration) {
      resolvedDuration = targetProvider.pricing[0].duration.trim();
    }
    const finalDuration = resolvedDuration || 'Duration not available';

    // Provider snapshot
    const providerSnapshot = {
      id: targetProvider._id,
      _id: targetProvider._id,
      name: targetProvider.name,
      rating: targetProvider.rating || 0,
      reviewsCount: targetProvider.reviewsCount || 0,
      photo: normalizeImageUrl(targetProvider.photo || ''),
      phone: targetProvider.phone || '',
      city: targetProvider.city || 'Coimbatore',
      category: targetProvider.category,
      rate: unitRate,
      pricingUnit: unit,
      duration: finalDuration
    };

    // Recommended list deduplicated
    const recommendedList = [];
    for (const prov of uniqueApproved.slice(0, 4)) {
      // Find all services for this provider to list multiple matching services
      const allServicesForProv = await Service.find({ providerId: prov._id, isAvailable: true }).lean();
      const servicesList = allServicesForProv.length > 0
        ? allServicesForProv.map(s => ({
            id: String(s._id),
            name: s.name,
            price: s.price,
            unit: s.pricingUnit || prov.pricingUnit || 'Per Visit',
            duration: s.estimatedDuration || 'Duration not available',
            description: s.description || ''
          }))
        : (prov.pricing && prov.pricing.length > 0
            ? prov.pricing.map(item => ({
                id: item._id ? String(item._id) : 'prc_' + prov._id,
                name: item.service || `${prov.category} Standard Service`,
                price: item.price || prov.rate || 0,
                unit: item.unit || prov.pricingUnit || 'Per Visit',
                duration: item.duration || 'Duration not available',
                description: item.description || ''
              }))
            : [{
                id: 'std_' + prov._id,
                name: `${prov.category} Standard Service`,
                price: prov.rate || 0,
                unit: prov.pricingUnit || 'Per Visit',
                duration: 'Duration not available'
              }]);

      const provObj = {
        id: prov._id,
        _id: prov._id,
        name: prov.name,
        rating: prov.rating || 0,
        reviewsCount: prov.reviewsCount || 0,
        photo: normalizeImageUrl(prov.photo || ''),
        city: prov.city || 'Coimbatore',
        category: prov.category,
        rate: prov.hourlyRate || prov.rate || unitRate,
        pricingUnit: prov.pricingUnit || unit,
        duration: (servicesList[0]?.duration) || finalDuration,
        services: servicesList
      };

      recommendedList.push(provObj);

      if (!addedProviderIds.has(String(prov._id))) {
        addedProviderIds.add(String(prov._id));
        allMatchingProviders.push(provObj);
      }
    }

    rawSteps.push({
      category: catName,
      serviceName: serviceTitle,
      serviceId: targetService?._id,
      provider: providerSnapshot,
      available: true,
      optimalOrderReason: PLANNER_ORDER_REASONS[catName] || 'Standard service phase.',
      duration: finalDuration,
      estimatedCost: calculatedFee,
      unitRate,
      pricingUnit: unit,
      breakdown: {
        providerServiceFee: calculatedFee,
        total: calculatedFee
      },
      recommendedProviders: recommendedList
    });
  }

  // Sort rawSteps by logical dependency priority
  rawSteps.sort((a, b) => {
    const pA = PLANNER_SERVICE_PRIORITY[a.category] || 99;
    const pB = PLANNER_SERVICE_PRIORITY[b.category] || 99;
    return pA - pB;
  });

  // Calculate sequence timeline days and total budget
  let currentDay = 1;
  let totalBudget = 0;

  const steps = rawSteps.map((step, idx) => {
    const isMultiDay = step.category === 'Painter' || step.category === 'Interior Designer';
    const durationDays = isMultiDay ? (effectiveRooms >= 3 ? 3 : 2) : 1;

    let schedule = '';
    if (!step.available) {
      schedule = 'Waiting on Provider';
    } else {
      schedule = durationDays > 1 ? `Day ${currentDay} to Day ${currentDay + durationDays - 1}` : `Day ${currentDay}`;
      currentDay += durationDays;
      totalBudget += step.estimatedCost;
    }

    return {
      ...step,
      stepNumber: idx + 1,
      schedule,
      daysDuration: durationDays,
      status: step.available ? (idx === 0 ? 'Ready to Start' : 'Queued') : 'Unavailable',
      rooms: effectiveRooms
    };
  });

  const totalDays = Math.max(1, currentDay - 1);

  // ── Construct 8 Structured Output Sections ──
  const understandingText = isPriceQuery
    ? `You inquired about the pricing and estimated provider fee for ${categoryList.join(', ')} in Coimbatore.`
    : isDurationQuery
    ? `You inquired about the service completion duration for ${categoryList.join(', ')} in Coimbatore.`
    : isBookingQuery
    ? `You requested booking and provider scheduling assistance for ${categoryList.join(', ')} in Coimbatore.`
    : inputMessage
    ? `You requested ${categoryList.join(' and ')} services for ${effectiveRooms} room(s) in Coimbatore: "${inputMessage}".`
    : `You requested an organized multi-service sequence plan for ${categoryList.join(' and ')} across ${effectiveRooms} room(s) in Coimbatore.`;

  const recommendedServiceText = categoryList
    .map(cat => `${cat}: ${PLANNER_SCOPE_DESCRIPTIONS[cat] || 'Standard professional home service.'}`)
    .join(' ');

  const requiredDetailsList = categoryList.map(cat => PLANNER_REQUIRED_DETAILS[cat] || `Standard on-site inspection requirements for ${cat}.`);
  requiredDetailsList.push(`Project room count configured to ${effectiveRooms} room(s).`);
  const requiredDetailsText = requiredDetailsList.join(' ');

  const suggestedWorkPlan = steps.map(s => ({
    stepNumber: s.stepNumber,
    category: s.category,
    serviceName: s.serviceName,
    phase: `Step ${s.stepNumber}: ${s.category} (${s.serviceName})`,
    description: PLANNER_SCOPE_DESCRIPTIONS[s.category] || 'Standard service phase.',
    optimalOrderReason: s.optimalOrderReason,
    schedule: s.schedule,
    duration: s.duration,
    estimatedCost: s.estimatedCost,
    status: s.status
  }));

  const nextStepText = steps.length > 0 && steps[0].available
    ? `Review the matching providers below and click 'Book Step' or 'Proceed to Booking' to schedule Step 1 on your preferred date and time.`
    : `Currently waiting on approved provider availability for the requested services in Coimbatore.`;

  const formattedCost = `₹${totalBudget.toLocaleString('en-IN')}`;
  const formattedDuration = `${totalDays} Day${totalDays > 1 ? 's' : ''}`;

  return {
    success: true,
    clarificationNeeded: false,
    plan: {
      // 8 Structured Output Sections
      understanding: understandingText,
      recommendedService: recommendedServiceText,
      requiredDetails: requiredDetailsText,
      suggestedWorkPlan: suggestedWorkPlan,
      matchingProviders: allMatchingProviders,
      estimatedCost: totalBudget,
      estimatedCostFormatted: formattedCost,
      estimatedDuration: formattedDuration,
      nextStep: nextStepText,

      // Retain existing fields for full backward compatibility
      steps,
      totalDuration: formattedDuration,
      totalBudget,
      rooms: effectiveRooms,
      selectedServices: steps.map(s => s.category),
      coimbatoreTip: 'Coimbatore Climate Note: If planning exterior painting or open roof plumbing in Coimbatore, schedule work outside heavy monsoon forecast periods. Electrical, carpentry, and deep cleaning can proceed smoothly indoors.'
    },
    reply: isPriceQuery
      ? `For ${categoryList.join(' and ')}, the estimated provider fee for ${effectiveRooms} room(s) in Coimbatore is ${formattedCost}, calculated strictly at genuine provider rates with zero platform surcharges.`
      : isDurationQuery
      ? `The estimated timeline for this project is ${formattedDuration} (${steps.map(s => s.category + ': ' + s.duration).join(', ')}).`
      : isBookingQuery
      ? `You can proceed to book any matching provider directly. Select a provider below and click 'Book Step' to choose your appointment date and time.`
      : `Created an optimal ${steps.length}-service sequence plan (${formattedDuration}, ${formattedCost}) for ${effectiveRooms} room(s) in Coimbatore.`
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINT: POST /api/ai/planner
// ─────────────────────────────────────────────────────────────────────────────
router.post('/planner', async (req, res) => {
  try {
    const result = await generateAIServicePlan(req.body);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Error generating AI service plan:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate AI service plan.' });
  }
});

export default router;
