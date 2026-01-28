"use client";

import dynamic from "next/dynamic";
import { menuCategories } from "@/features/menu/constants";
import { useMenuItems } from "@/features/menu/hooks/useMenuItems";
import type { MenuItem } from "@/features/menu/types";
import { useLocale } from "@/hooks/useLocale";
import { useTheme } from "@/hooks/useTheme";
import {
  FireOutlined,
  MoonOutlined,
  SearchOutlined,
  ShoppingOutlined,
  StarFilled,
  SunOutlined,
} from "@ant-design/icons";
import {
  Button,
  Col,
  Input,
  Modal,
  Row,
  Select,
  Spin,
  Tag,
} from "antd";
import { Playfair_Display, Space_Grotesk } from "next/font/google";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Dynamic import for Three.js background
const MenuBackground3D = dynamic(
  () => import("@/features/menu/components/MenuBackground3D"),
  { ssr: false }
);

const displayFont = Playfair_Display({ subsets: ["latin"], variable: "--font-display" });
const bodyFont = Space_Grotesk({ subsets: ["latin"], variable: "--font-body" });

type SortKey = "featured" | "priceAsc" | "priceDesc" | "nameAsc" | "nameDesc";

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  coffee: { bg: "rgba(180, 83, 9, 0.15)", text: "#f59e0b", border: "rgba(180, 83, 9, 0.4)" },
  tea: { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981", border: "rgba(16, 185, 129, 0.4)" },
  dessert: { bg: "rgba(236, 72, 153, 0.15)", text: "#ec4899", border: "rgba(236, 72, 153, 0.4)" },
  food: { bg: "rgba(59, 130, 246, 0.15)", text: "#3b82f6", border: "rgba(59, 130, 246, 0.4)" },
  other: { bg: "rgba(148, 163, 184, 0.15)", text: "#94a3b8", border: "rgba(148, 163, 184, 0.4)" },
};

export default function MenuPage() {
  const { items: hookItems, loading: hookLoading, searchItems, searchMeta } = useMenuItems({
    initialFetchPath: "/api/menus",
    searchPath: "/api/menus",
    searchMethod: "GET",
    includeAuth: false,
    autoFetch: false,
    restaurantId: 9
  });
  const { t, locale, setLocale } = useLocale();
  const { isDark, setMode } = useTheme();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("featured");
  const [zoomedItem, setZoomedItem] = useState<MenuItem | null>(null);

  // Infinite scroll state
  const [allItems, setAllItems] = useState<MenuItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const ITEMS_PER_PAGE = 20;

  const formatter = new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });

  // Load initial items
  useEffect(() => {
    const loadInitialItems = async () => {
      setCurrentPage(1);
      setAllItems([]);
      await searchItems({ limit: ITEMS_PER_PAGE, page: 1 });
    };
    loadInitialItems();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update allItems when hookItems change
  useEffect(() => {
    if (hookItems.length > 0) {
      if (currentPage === 1) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- accumulating paginated results intentionally
        setAllItems(hookItems);
      } else {
        setAllItems((prev) => {
          const newItems = hookItems.filter(
            (item: MenuItem) => !prev.some((p) => p.id === item.id)
          );
          return [...prev, ...newItems];
        });
      }
      setIsLoadingMore(false);
    }
  }, [hookItems, currentPage]);

  // Update hasMore based on searchMeta
  useEffect(() => {
    if (searchMeta) {
      if (typeof searchMeta.hasMore === "boolean") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- derive flag from server meta
        setHasMore(searchMeta.hasMore);
        return;
      }
      const { page, totalPages } = searchMeta;
      if (page !== null && totalPages !== null) {
        setHasMore(page < totalPages);
      }
    }
  }, [searchMeta]);

  // Load more function
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || hookLoading) return;

    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    const nextCursor = searchMeta?.nextCursor;
    await searchItems({
      limit: ITEMS_PER_PAGE,
      page: nextCursor ? undefined : nextPage,
      cursor: nextCursor ?? undefined,
      filter: searchTerm || undefined,
      category: activeCategory === "all" ? undefined : activeCategory,
    });
  }, [activeCategory, currentPage, hasMore, hookLoading, isLoadingMore, searchItems, searchTerm, ITEMS_PER_PAGE, searchMeta?.nextCursor]);

  // Reset when category changes
  useEffect(() => {
    const resetAndReload = async () => {
      setCurrentPage(1);
      setAllItems([]);
      setHasMore(true);
      await searchItems({
        limit: ITEMS_PER_PAGE,
        page: 1,
        category: activeCategory === "all" ? undefined : activeCategory,
      });
    };
    resetAndReload();
  }, [activeCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset when search term changes (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      setCurrentPage(1);
      setAllItems([]);
      setHasMore(true);
      await searchItems({
        limit: ITEMS_PER_PAGE,
        page: 1,
        filter: searchTerm || undefined,
        category: activeCategory === "all" ? undefined : activeCategory,
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first && first.isIntersecting && hasMore && !isLoadingMore && !hookLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, isLoadingMore, hookLoading, loadMore]);

  const availableItems = useMemo(() => allItems.filter((item) => item.available), [allItems]);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const nameCollator = useMemo(() => new Intl.Collator(locale === "vi" ? "vi-VN" : "en-US"), [locale]);

  const filteredItems = useMemo(() => {
    const searched = normalizedSearch
      ? availableItems.filter((item) => {
          const name = t(item.name).toLowerCase();
          const description = item.description ? t(item.description).toLowerCase() : "";
          return name.includes(normalizedSearch) || description.includes(normalizedSearch);
        })
      : availableItems;
    const categoryFiltered =
      activeCategory === "all" ? searched : searched.filter((item) => item.category === activeCategory);
    const sorted = [...categoryFiltered];
    switch (sortKey) {
      case "priceAsc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "priceDesc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "nameAsc":
        sorted.sort((a, b) => nameCollator.compare(t(a.name), t(b.name)));
        break;
      case "nameDesc":
        sorted.sort((a, b) => nameCollator.compare(t(b.name), t(a.name)));
        break;
      default:
        break;
    }
    return sorted;
  }, [activeCategory, availableItems, nameCollator, normalizedSearch, sortKey, t]);

  const handleImageZoom = (item: MenuItem, event?: React.SyntheticEvent) => {
    event?.stopPropagation();
    if (!item.imageUrl?.trim()) return;
    setZoomedItem(item);
  };

  const categoryLabel = (value: string) => {
    const category = menuCategories.find((item) => item.value === value);
    return category ? t(category.labelKey) : value;
  };

  const filterOptions = useMemo(
    () => [
      { value: "all", label: t("menu.filters.all") },
      ...menuCategories.map((category) => ({ value: category.value, label: t(category.labelKey) })),
    ],
    [t],
  );

  const sortOptions = useMemo(
    () => [
      { value: "featured", label: t("menu.sort.featured") },
      { value: "priceAsc", label: t("menu.sort.priceAsc") },
      { value: "priceDesc", label: t("menu.sort.priceDesc") },
      { value: "nameAsc", label: t("menu.sort.nameAsc") },
      { value: "nameDesc", label: t("menu.sort.nameDesc") },
    ],
    [t],
  );

  // Top 3 featured items
  const featuredItems = useMemo(() => {
    if (availableItems.length === 0) return [];
    const sortedByPrice = [...availableItems].sort((a, b) => b.price - a.price);
    return sortedByPrice.slice(0, 3);
  }, [availableItems]);

  const zoomedImageUrl = zoomedItem?.imageUrl?.trim();

  return (
    <div className={`menu-page-3d ${displayFont.variable} ${bodyFont.variable}`}>
      {/* Three.js Background */}
      <MenuBackground3D />

      {/* Gradient Overlay */}
      <div className="menu-gradient-overlay" />

      {/* Content */}
      <div className="menu-content-wrapper">
        {/* Header */}
        <header className="menu-header-3d">
          <div className="menu-header-inner">
            <div className="menu-brand-3d">
              <span className="menu-brand-emoji">✨</span>
              <span className="menu-brand-text">{t("menu.qrTitle") || "Menu"}</span>
            </div>
            <div className="menu-header-actions">
              <div className="menu-lang-toggle">
                <button
                  type="button"
                  className={`menu-lang-btn ${locale === "vi" ? "active" : ""}`}
                  onClick={() => setLocale("vi")}
                >
                  VI
                </button>
                <button
                  type="button"
                  className={`menu-lang-btn ${locale === "en" ? "active" : ""}`}
                  onClick={() => setLocale("en")}
                >
                  EN
                </button>
              </div>
              <button
                type="button"
                className="menu-theme-btn-3d"
                onClick={() => setMode(isDark ? "light" : "dark")}
                aria-label="Toggle theme"
              >
                {isDark ? <SunOutlined /> : <MoonOutlined />}
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="menu-hero-3d">
          <div className="menu-hero-content">
            <span className="menu-hero-badge">Premium Selection</span>
            <h1 className="menu-hero-title">
              {t("menu.qrTitle") || "Discover Our Menu"}
            </h1>
            <p className="menu-hero-subtitle">
              {t("menu.qrSubtitle") || "Crafted with passion, served with love"}
            </p>
            <div className="menu-hero-stats">
              <div className="menu-stat-item">
                <span className="menu-stat-number">{availableItems.length}</span>
                <span className="menu-stat-label">Items</span>
              </div>
              <div className="menu-stat-divider" />
              <div className="menu-stat-item">
                <span className="menu-stat-number">{menuCategories.length}</span>
                <span className="menu-stat-label">Categories</span>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Section */}
        {featuredItems.length > 0 && (
          <section className="menu-featured-3d">
            <div className="menu-section-header">
              <div className="menu-section-title">
                <FireOutlined className="menu-section-icon" />
                <span>{t("menu.specials.title") || "Featured"}</span>
              </div>
            </div>

            <div className="menu-featured-scroll">
              {featuredItems.map((item, index) => {
                const imageUrl = item.imageUrl?.trim();
                const colors = categoryColors[item.category] || categoryColors.other;
                const badges = ["✦ SIGNATURE", "♥ POPULAR", "★ BEST"];

                return (
                  <div
                    key={item.id}
                    className="menu-featured-card-3d"
                    onClick={() => imageUrl && handleImageZoom(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && imageUrl && handleImageZoom(item)}
                  >
                    <div className="menu-card-glow" />
                    <div className="menu-card-image-3d">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={t(item.name)}
                          fill
                          sizes="300px"
                          style={{ objectFit: "cover" }}
                        />
                      ) : (
                        <div className="menu-card-placeholder-3d">
                          <StarFilled />
                        </div>
                      )}
                      <span className="menu-card-badge-3d">{badges[index]}</span>
                    </div>
                    <div className="menu-card-content-3d">
                      <Tag
                        style={{
                          background: colors.bg,
                          color: colors.text,
                          border: `1px solid ${colors.border}`,
                          backdropFilter: "blur(8px)",
                        }}
                      >
                        {categoryLabel(item.category)}
                      </Tag>
                      <h3 className="menu-card-name-3d">{t(item.name)}</h3>
                      <p className="menu-card-desc-3d">
                        {item.description ? t(item.description) : "Delicious & Fresh"}
                      </p>
                      <div className="menu-card-footer-3d">
                        <span className="menu-card-price-3d">{formatter.format(item.price)}</span>
                        <Button
                          type="primary"
                          icon={<ShoppingOutlined />}
                          className="menu-card-btn-3d"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Browse Section */}
        <section className="menu-browse-3d">
          <div className="menu-section-header">
            <h2 className="menu-section-title">
              {t("menu.browseTitle") || "All Items"}
            </h2>
            <span className="menu-item-count">{filteredItems.length} items</span>
          </div>

          {/* Filters */}
          <div className="menu-filters-3d">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder={t("menu.search.placeholder") || "Search menu..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="menu-search-3d"
            />
            <div className="menu-filter-row-3d">
              <div className="menu-pills-3d">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`menu-pill-3d ${activeCategory === option.value ? "active" : ""}`}
                    onClick={() => setActiveCategory(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <Select
                value={sortKey}
                onChange={(value) => setSortKey(value as SortKey)}
                options={sortOptions}
                className="menu-sort-3d"
                popupMatchSelectWidth={false}
              />
            </div>
          </div>

          {/* Menu Grid */}
          <div className="menu-grid-3d">
            <Row gutter={[16, 16]}>
              {filteredItems.map((item) => {
                const imageUrl = item.imageUrl?.trim();
                const colors = categoryColors[item.category] || categoryColors.other;

                return (
                  <Col xs={12} sm={8} md={6} lg={4} key={item.id}>
                    <div
                      className="menu-item-card-3d"
                      onClick={() => imageUrl && handleImageZoom(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && imageUrl && handleImageZoom(item)}
                    >
                      <div className="menu-item-image-3d">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={t(item.name)}
                            fill
                            sizes="200px"
                            style={{ objectFit: "cover" }}
                          />
                        ) : (
                          <div className="menu-item-placeholder-3d" />
                        )}
                      </div>
                      <div className="menu-item-info-3d">
                        <Tag
                          className="menu-item-tag-3d"
                          style={{
                            background: colors.bg,
                            color: colors.text,
                            border: `1px solid ${colors.border}`,
                          }}
                        >
                          {categoryLabel(item.category)}
                        </Tag>
                        <h4 className="menu-item-name-3d">{t(item.name)}</h4>
                        <div className="menu-item-bottom-3d">
                          <span className="menu-item-price-3d">{formatter.format(item.price)}</span>
                          <button
                            type="button"
                            className="menu-item-add-3d"
                            onClick={(e) => e.stopPropagation()}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </Col>
                );
              })}
            </Row>

            {filteredItems.length === 0 && !hookLoading && (
              <div className="menu-empty-3d">
                <p>{t("menu.empty") || "No items found"}</p>
              </div>
            )}
          </div>

          {/* Load More */}
          {hasMore && (
            <div ref={loadMoreRef} className="menu-load-more-3d">
              {isLoadingMore && <Spin />}
            </div>
          )}

          {hookLoading && currentPage === 1 && (
            <div className="menu-loading-3d">
              <Spin size="large" />
            </div>
          )}
        </section>
      </div>

      {/* Zoom Modal */}
      <Modal
        open={Boolean(zoomedImageUrl)}
        onCancel={() => setZoomedItem(null)}
        footer={null}
        centered
        width={500}
        className="menu-zoom-modal-3d"
      >
        {zoomedItem && zoomedImageUrl && (
          <div className="menu-zoom-content-3d">
            <div className="menu-zoom-image-3d">
              <Image
                src={zoomedImageUrl}
                alt={t(zoomedItem.name)}
                fill
                sizes="500px"
                style={{ objectFit: "cover" }}
              />
            </div>
            <div className="menu-zoom-info-3d">
              <h3>{t(zoomedItem.name)}</h3>
              {zoomedItem.description && <p>{t(zoomedItem.description)}</p>}
              <div className="menu-zoom-footer-3d">
                <span className="menu-zoom-price-3d">{formatter.format(zoomedItem.price)}</span>
                <Button type="primary" icon={<ShoppingOutlined />}>
                  Add to Order
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
