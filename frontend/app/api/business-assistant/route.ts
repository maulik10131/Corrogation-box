import { NextResponse } from 'next/server';

const suggestions = {
  quotation:
    'ક્વોટેશન માટે: 3 દિવસથી જૂના મોકલેલા ક્વોટેશન પર તરત ફોલો-અપ કરો અને મંજૂર ક્વોટેશનને ઝડપથી ઓર્ડરમાં કન્વર્ટ કરો.',
  inventory:
    'ઇન્વેન્ટરી માટે: રોજ ઓછા સ્ટોકવાળા આઇટમ ચેક કરો, ખાસ કરીને વધુ વપરાશવાળા પેપર ગ્રેડ, અને સેફ્ટી સ્ટોક ધ્યાનમાં રાખીને ઓર્ડર કરો.',
  attendance:
    'હાજરી માટે: લેટ ચેક-ઇન અને ગેરહાજરીનો સાપ્તાહિક ટ્રેન્ડ ટ્રેક કરો, પછી શિફ્ટની જરૂરિયાત મુજબ મેનપાવર પ્લાન કરો.',
  dashboard:
    'ડેશબોર્ડ રિવ્યુ માટે: પ્રોડક્શન, ડિસ્પેચ અને પેન્ડિંગ ક્વોટેશનમાં આજે અને ગઈકાલની તુલના કરો જેથી બોટલનેક વહેલી ઓળખી શકાય.',
  default:
    'હું ક્વોટેશન, ઇન્વેન્ટરી, હાજરી, ખર્ચ નિયંત્રણ અને દૈનિક આયોજનમાં મદદ કરી શકું છું. ઉદાહરણ તરીકે પૂછો: "ક્વોટેશન કન્વર્ઝન કેવી રીતે સુધારું?"',
};

function getBusinessReply(message: string) {
  const text = message.toLowerCase();

  if (
    text.includes('quotation') ||
    text.includes('quote') ||
    text.includes('customer') ||
    text.includes('ક્વોટેશન') ||
    text.includes('ગ્રાહક')
  ) {
    return suggestions.quotation;
  }

  if (
    text.includes('inventory') ||
    text.includes('stock') ||
    text.includes('material') ||
    text.includes('ઇન્વેન્ટરી') ||
    text.includes('સ્ટોક') ||
    text.includes('મટીરિયલ')
  ) {
    return suggestions.inventory;
  }

  if (
    text.includes('attendance') ||
    text.includes('employee') ||
    text.includes('staff') ||
    text.includes('હાજરી') ||
    text.includes('કર્મચારી') ||
    text.includes('સ્ટાફ')
  ) {
    return suggestions.attendance;
  }

  if (
    text.includes('dashboard') ||
    text.includes('report') ||
    text.includes('kpi') ||
    text.includes('ડેશબોર્ડ') ||
    text.includes('રિપોર્ટ')
  ) {
    return suggestions.dashboard;
  }

  return suggestions.default;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = String(body?.message || '').trim();

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'મેસેજ જરૂરી છે' },
        { status: 400 }
      );
    }

    const reply = getBusinessReply(message);

    return NextResponse.json({
      success: true,
      reply,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'અમાન્ય વિનંતી' },
      { status: 400 }
    );
  }
}
