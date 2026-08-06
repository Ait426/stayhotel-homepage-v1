export const runtime = 'edge';

import { createTranslator } from '@/lib/translations';
import { buildAlternates } from '@/lib/seo';

interface PageProps {
    params: { locale: string };
}

export async function generateMetadata({ params }: PageProps) {
    const t = createTranslator(params.locale, 'location');
    return {
        title: t('title'),
        description: t('subtitle'),
        alternates: buildAlternates(params.locale, '/location'),
    };
}

export default async function LocationPage({ params }: PageProps) {
    const { locale } = params;
    const t = createTranslator(locale, 'location');

    return (
        <div className="min-h-screen bg-white pb-20">
            {/* Header Section - Matches Rooms Page Style */}
            <section className="relative h-[50vh] md:h-[65vh] min-h-[350px] md:min-h-[500px] flex items-center justify-center overflow-hidden">
                {/* Background */}
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: 'url(/images/rooms/standard/5.JPG)',
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-primary-900/70 via-primary-900/50 to-primary-900/80" />

                {/* Content */}
                <div className="relative z-10 container mx-auto px-6 text-center text-white">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-normal text-white mb-6 tracking-wide">
                        Location
                    </h1>
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <div className="w-12 h-px bg-accent-500" />
                        <div className="w-1.5 h-1.5 rotate-45 bg-accent-500" />
                        <div className="w-12 h-px bg-accent-500" />
                    </div>
                </div>
            </section>

            {/* Content Section */}
            <div className="container mx-auto px-6 py-20">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
                    {/* Info Column */}
                    <div>
                        <div className="mb-12">
                            <h2 className="text-3xl font-serif text-primary-900 mb-8">{t('title')}</h2>
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-6 h-6 mt-1 flex-shrink-0 text-accent-600">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-lg text-gray-900 mb-1">{t('address_label')}</h3>
                                        <p className="text-gray-600 leading-relaxed">{t('address_value')}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-6 h-6 mt-1 flex-shrink-0 text-accent-600">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-lg text-gray-900 mb-1">{t('phone_label')}</h3>
                                        <p className="text-gray-600">{t('phone_value')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 pt-10">
                            <h3 className="text-xl font-serif text-primary-900 mb-6">{t('transport')}</h3>
                            <ul className="space-y-6">
                                <li className="flex gap-4">
                                    <span className="w-24 flex-shrink-0 font-medium text-accent-600">{t('subway')}</span>
                                    <span className="text-gray-600">{t('subway_desc')}</span>
                                </li>
                                <li className="flex gap-4">
                                    <span className="w-24 flex-shrink-0 font-medium text-accent-600">{t('bus')}</span>
                                    <span className="text-gray-600">{t('bus_desc')}</span>
                                </li>
                                <li className="flex gap-4">
                                    <span className="w-24 flex-shrink-0 font-medium text-accent-600">{t('car')}</span>
                                    <span className="text-gray-600">{t('car_desc')}</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Map Column */}
                    <div className="h-[400px] lg:h-auto bg-gray-100 rounded-lg overflow-hidden border border-gray-200 relative group min-h-[400px]">
                        <iframe
                            width="100%"
                            height="100%"
                            id="gmap_canvas"
                            src="https://maps.google.com/maps?q=경기도+평택시+평택1로+7&t=&z=15&ie=UTF8&iwloc=&output=embed"
                            frameBorder="0"
                            scrolling="no"
                            marginHeight={0}
                            marginWidth={0}
                            title="Pyeongtaek Stay Hotel Location"
                            className="w-full h-full grayscale hover:grayscale-0 transition-all duration-500"
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}
