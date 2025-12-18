import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, User, ArrowRight, Search, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Blog() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const featuredPost = {
    slug: "future-remote-collaboration-2024",
    title: "The Future of Remote Team Collaboration: 5 Trends to Watch in 2024",
    excerpt: "Discover the emerging trends that will shape how distributed teams work together, from AI-powered workflows to immersive virtual workspaces.",
    author: "Sarah Johnson",
    date: "November 15, 2024",
    readTime: "8 min read",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop",
    category: "Trends"
  };

  const posts = [
    {
      slug: "building-high-performance-remote-teams",
      title: "Building High-Performance Remote Teams: A Complete Guide",
      excerpt: "Learn proven strategies for creating and managing successful remote teams that deliver exceptional results.",
      author: "Michael Chen",
      date: "November 12, 2024",
      readTime: "6 min read",
      image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=400&h=250&fit=crop",
      category: "Leadership"
    },
    {
      slug: "mastering-agile-teamflow",
      title: "Mastering Agile Project Management with TeamFlow",
      excerpt: "Step-by-step guide to implementing agile methodologies using TeamFlow's powerful project management tools.",
      author: "Emily Rodriguez",
      date: "November 10, 2024",
      readTime: "5 min read",
      image: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=250&fit=crop",
      category: "Tutorial"
    },
    {
      slug: "psychology-productive-teams",
      title: "The Psychology of Productive Teams: What Science Tells Us",
      excerpt: "Explore the research-backed insights into what makes teams truly productive and how to apply these findings to your organization.",
      author: "Dr. Sarah Martinez",
      date: "November 8, 2024",
      readTime: "7 min read",
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=250&fit=crop",
      category: "Research"
    },
    {
      slug: "security-best-practices-collaboration",
      title: "Security Best Practices for Team Collaboration Tools",
      excerpt: "Essential security measures every team should implement when using collaboration platforms to protect sensitive data.",
      author: "James Wilson",
      date: "November 5, 2024",
      readTime: "4 min read",
      image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=250&fit=crop",
      category: "Security"
    },
    {
      slug: "customer-success-techcorp",
      title: "Customer Success Story: How TechCorp Increased Productivity by 40%",
      excerpt: "Real-world case study showing how TechCorp transformed their project management processes using TeamFlow.",
      author: "Lisa Chen",
      date: "November 3, 2024",
      readTime: "3 min read",
      image: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=250&fit=crop",
      category: "Case Study"
    },
    {
      slug: "integration-spotlight-developer-tools",
      title: "Integration Spotlight: Connecting TeamFlow with Developer Tools",
      excerpt: "Discover how to seamlessly integrate TeamFlow with popular development tools like GitHub, Jira, and Slack.",
      author: "Alex Kumar",
      date: "November 1, 2024",
      readTime: "5 min read",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=250&fit=crop",
      category: "Integration"
    }
  ];

  const categories = ["All", "Trends", "Leadership", "Tutorial", "Research", "Security"];

  const filteredPosts = posts.filter(post => {
    const matchesSearchTerm = post.title.toLowerCase().includes(searchTerm.toLowerCase()) || post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === "All" || post.category === activeCategory;
    return matchesSearchTerm && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <section className="py-24 px-6 bg-gradient-to-br from-background to-secondary/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              TeamFlow Blog
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              Insights, tutorials, and best practices for modern team collaboration
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="container mx-auto max-w-6xl">
          <Card className="rounded-3xl border-border/40 overflow-hidden shadow-lg">
            <div className="grid md:grid-cols-2 gap-0">
              <div className="p-12 flex flex-col justify-center">
                <Badge className="w-fit mb-4 bg-primary/10 text-primary">
                  Featured
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                  {featuredPost.title}
                </h2>
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  {featuredPost.excerpt}
                </p>
                <Button
                  className="w-fit rounded-2xl"
                  onClick={() => navigate(`/blog/${featuredPost.slug}`)}
                >
                  Read Article
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <div className="h-64 md:h-auto">
                <img
                  src={featuredPost.image}
                  alt={featuredPost.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="py-12 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div className="mb-4 md:mb-0">
              <h3 className="text-2xl font-bold">All Articles</h3>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search articles..."
                  className="pl-10 rounded-2xl min-w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((category, index) => (
                  <Button
                    key={index}
                    variant={activeCategory === category ? "default" : "outline"}
                    size="sm"
                    className="rounded-2xl"
                    onClick={() => setActiveCategory(category)}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post, index) => (
              <Card
                key={index}
                className="rounded-3xl border-border/40 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
                onClick={() => navigate(`/blog/${post.slug}`)}
              >
                <div className="aspect-video overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="secondary" className="text-xs">
                      {post.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{post.readTime}</span>
                  </div>
                  <CardTitle className="text-xl leading-tight group-hover:text-primary transition-colors">
                    {post.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-muted-foreground mb-4 line-clamp-3">{post.excerpt}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {post.author}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {post.date}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredPosts.length === 0 && (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No articles found</h3>
              <p className="text-muted-foreground">Try adjusting your search terms or filters.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
