export const runtime = 'edge';

import { createTranslator } from '@/lib/translations';
import { buildAlternates } from '@/lib/seo';
import { fetchNaverBlogPosts, getNaverBlogId } from '@/lib/utils/blog';
import BlogList from '@/components/BlogList';

interface PageProps {
    params: { locale: string };
}

export async function generateMetadata({ params }: PageProps) {
    const t = createTranslator(params.locale, 'blog');
    return {
        title: t('title'),
        description: t('subtitle'),
        alternates: buildAlternates(params.locale, '/blog'),
    };
}

export default async function BlogPage({ params }: PageProps) {
    const { locale } = params;
    // Fetch blog posts (limit 6)
    const blogId = getNaverBlogId();
    const { posts } = await fetchNaverBlogPosts(blogId, 6);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header Section */}
            <section className="relative h-[50vh] md:h-[65vh] min-h-[350px] md:min-h-[500px] flex items-center justify-center overflow-hidden bg-primary-900">
                <img
                    src="https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=1920&auto=format&fit=crop"
                    alt="Blog"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
                <div className="relative z-10 container mx-auto px-6 text-center text-white">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-normal text-white mb-6 tracking-wide">
                        Blog
                    </h1>
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <div className="w-12 h-px bg-accent-500" />
                        <div className="w-1.5 h-1.5 rotate-45 bg-accent-500" />
                        <div className="w-12 h-px bg-accent-500" />
                    </div>
                </div>
            </section>

            {/* Blog List Section */}
            <div className="container mx-auto px-6 pt-16 relative z-20">
                <BlogList posts={posts} locale={locale} />

                {/* Connection Status Message */}
                {!blogId || blogId === 'your_naver_blog_id' ? (
                    <div className="mt-12 text-center p-6 bg-amber-50 rounded-lg border border-amber-100 max-w-2xl mx-auto">
                        <p className="text-amber-800 text-sm">
                            * {{ ko: '현재 데모 모드로 작동 중입니다. .env.local 파일에 네이버 블로그 ID를 설정하면 실제 글을 불러올 수 있습니다.',
                                en: 'Running in demo mode. Configure Naver Blog ID in .env.local to fetch real posts.',
                                ja: '現在デモモードで動作中です。.env.localファイルにNaverブログIDを設定すると実際の記事を読み込めます。',
                                zh: '当前为演示模式。在.env.local文件中配置Naver博客ID以获取实际文章。'
                            }[locale]}
                        </p>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
