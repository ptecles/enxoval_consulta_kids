import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import SearchBar from './components/SearchBar';
import ProductService, { Product } from './services/ProductService';
import Login from './components/Login';
import { useAuth } from './contexts/AuthContext';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuth();

  // URL management utilities
  const getFiltersFromURL = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      query: params.get('q') || '',
      brand: params.get('brand') || '',
      category: params.get('category') || '',
      subcategory: params.get('subcategory') || '',
      age: params.get('age') || ''
    };
  };

  const updateURL = useCallback((query: string, brand: string, category: string, subcategory: string, age: string) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (brand) params.set('brand', brand);
    if (category) params.set('category', category);
    if (subcategory) params.set('subcategory', subcategory);
    if (age) params.set('age', age);
    
    const newURL = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.pushState({}, '', newURL);
  }, []);

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [, setSubcategoryOptions] = useState<string[]>([]);
  const [ageOptions, setAgeOptions] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [selectedAge, setSelectedAge] = useState<string>('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileExpandedCategory, setMobileExpandedCategory] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Define handleSearch before useEffect to avoid hoisting issues
  const handleSearch = useCallback((query: string, brandFilter?: string, categoryFilter?: string, subcategoryFilter?: string, ageFilter?: string) => {
    const currentBrand = brandFilter !== undefined ? brandFilter : selectedBrand;
    const currentCategory = categoryFilter !== undefined ? categoryFilter : selectedCategory;
    const currentSubcategory = subcategoryFilter !== undefined ? subcategoryFilter : selectedSubcategory;
    const currentAge = ageFilter !== undefined ? ageFilter : selectedAge;
    
    // Update URL with current filters
    try {
      updateURL(query, currentBrand, currentCategory, currentSubcategory, currentAge);
    } catch (err) {
      console.error('URL update failed:', err);
    }
    
    if (!query.trim() && !currentBrand && !currentCategory && !currentSubcategory && !currentAge) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    // Split the search query into individual words
    const searchWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    
    // Apply all filters: search query, brand, category, and subcategory
    const filteredProducts = allProducts.filter((product: Product) => {
      // Text search filter
      const productName = product.name.toLowerCase();
      const productBrand = product.marca.toLowerCase();
      const matchesSearchQuery = searchWords.length === 0 || searchWords.some(word => 
        productName.includes(word) || productBrand.includes(word)
      );
      
      // Brand filter
      const matchesBrand = !currentBrand || product.marca === currentBrand;
      
      // Category filter
      const matchesCategory = !currentCategory || product.category === currentCategory;

      // Subcategory filter (only if a category is selected; if not, ignore)
      const matchesSubcategory = !currentSubcategory || product.subcategory === currentSubcategory;
      
      // Age filter - check if currentAge matches any of the three age fields
      const matchesAge = !currentAge || 
        product.idade === currentAge || 
        product.idade2 === currentAge || 
        product.idade3 === currentAge;
      
      // Product must match all active filters
      return matchesSearchQuery && matchesBrand && matchesCategory && matchesSubcategory && matchesAge;
    });
    
    setSearchResults(filteredProducts);
    setHasSearched(true);
  }, [allProducts, selectedBrand, selectedCategory, selectedSubcategory, selectedAge, updateURL]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      try {
        const urlFilters = getFiltersFromURL();
        
        // Force immediate state updates for mobile
        setTimeout(() => {
          // Update state to match URL
          setSelectedBrand(urlFilters.brand);
          setSelectedCategory(urlFilters.category);
          setSelectedSubcategory(urlFilters.subcategory);
          setSelectedAge(urlFilters.age);
          
          // Close mobile menu if open
          setIsMobileMenuOpen(false);
          setMobileExpandedCategory(null);
          setOpenDropdown(null);
          
          // Check if we have any filters (more robust check)
          const hasAnyFilter = !!(
            (urlFilters.query && urlFilters.query.trim()) ||
            (urlFilters.brand && urlFilters.brand.trim()) ||
            (urlFilters.category && urlFilters.category.trim()) ||
            (urlFilters.subcategory && urlFilters.subcategory.trim()) ||
            (urlFilters.age && urlFilters.age.trim())
          );
          
          if (hasAnyFilter) {
            setHasSearched(true);
            handleSearch(urlFilters.query, urlFilters.brand, urlFilters.category, urlFilters.subcategory, urlFilters.age);
          } else {
            // Force clear everything for home state
            setHasSearched(false);
            setSearchResults([]);
            
            // Also clear any selected states that might interfere
            setSelectedBrand('');
            setSelectedCategory('');
            setSelectedSubcategory('');
            setSelectedAge('');
            
            // IMPORTANT: Force clean URL when going to home state
            try {
              window.history.replaceState({}, '', window.location.pathname);
            } catch (err) {
              console.error('Failed to clean URL:', err);
            }
          }
        }, 50); // Longer delay for mobile
        
      } catch (err) {
        console.error('PopState error:', err);
      }
    };

    // Also listen to hashchange for better mobile support
    const handleHashChange = () => {
      const syntheticEvent = new PopStateEvent('popstate', { state: null });
      handlePopState(syntheticEvent);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [handleSearch]);

  // Fetch products from Google Sheets when component mounts
  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setIsLoading(true);
        const products = await ProductService.fetchProducts();
        setAllProducts(products);
        
        // Extract unique brands, categories, and ages
        const uniqueBrands = Array.from(new Set(products
          .map(product => product.marca)
          .filter(brand => brand && brand.trim() !== '')
          .sort()));
        
        const uniqueCategories = Array.from(new Set(products
          .map(product => product.category)
          .filter(category => category && 
            category.trim() !== '' && 
            category.toLowerCase() !== 'categoria' && 
            category.toLowerCase() !== 'uncategorized')
          .sort()));
        
        // Extract unique ages from all three age columns, filtering out default "idade" values
        const allAges = products.flatMap(product => [product.idade, product.idade2, product.idade3]);
        const uniqueAges = Array.from(new Set(allAges
          .filter(age => age && age.trim() !== '' && age.trim().toLowerCase() !== 'idade')
          .sort()));
        
        setBrandOptions(uniqueBrands);
        setCategoryOptions(uniqueCategories);
        setAgeOptions(uniqueAges);
        // initialize subcategories empty until a category is chosen
        setSubcategoryOptions([]);
      } catch (err) {
        console.error('Error loading products:', err);
        setError('Failed to load products. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductData();
  }, []);



  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa' }}>
        <div style={{ textAlign: 'center', color: '#638CA6', fontFamily: 'Georgia, serif' }}>
          <div style={{ border: '3px solid #f3f3f3', borderTop: '3px solid #638CA6', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 15px' }} />
          Carregando...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="App">
      <header className="App-header-top">
        <div className="header-left">
          <button 
            className={`mobile-menu-toggle ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          <img
            src="https://enxovalinteligente.com.br/wp-content/uploads/2026/02/depois_do_enxoval_transparente.png"
            alt="Depois do Enxoval"
            className="header-logo-img"
            style={{ height: '144px', width: 'auto', objectFit: 'contain', marginLeft: '0px', marginTop: '20px' }}
          />
        </div>
        <div className="header-search">
          <SearchBar onSearch={handleSearch} />
        </div>
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingRight: '15px' }}>
          <span style={{ fontSize: '13px', color: '#666', fontFamily: 'Georgia, serif', whiteSpace: 'nowrap' }}>
            👋 {user?.name || 'Usuária'}
          </span>
          <button
            onClick={logout}
            style={{
              background: 'transparent',
              border: '1px solid #D98C73',
              color: '#D98C73',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'Georgia, serif',
              whiteSpace: 'nowrap'
            }}
          >
            Sair
          </button>
        </div>
      </header>
      {/* Menu de categorias - apenas quando houver busca ativa */}
      {hasSearched && (
        <div className="header-bar-bottom">
        <div className="categories-nav desktop-nav">
          <button 
            className={`category-btn ${!selectedCategory ? 'active' : ''}`}
            onClick={() => {
              setSelectedCategory('');
              setSelectedSubcategory('');
              setSubcategoryOptions([]);
              setSelectedBrand('');
              setSelectedAge('');
              setSearchResults([]);
              setHasSearched(false);
              setOpenDropdown(null);
              const searchInput = document.querySelector<HTMLInputElement>('.search-input');
              if (searchInput) {
                searchInput.value = '';
              }
            }}
          >
            Home
          </button>
          {categoryOptions.map(category => {
            const categorySubcategories = Array.from(new Set(allProducts
              .filter(p => p.category === category)
              .map(p => p.subcategory)
              .filter(sc => sc && sc.trim() !== '')
            )).sort();
            
            return (
              <div 
                key={category} 
                className="category-dropdown-container"
                onMouseEnter={() => categorySubcategories.length > 0 && setOpenDropdown(category)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button 
                  className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => {
                    const newCategory = category === selectedCategory ? '' : category;
                    setSelectedCategory(newCategory);
                    // Reset subcategory when category changes
                    const newSubcategories = newCategory
                      ? Array.from(new Set(allProducts
                          .filter(p => p.category === newCategory)
                          .map(p => p.subcategory)
                          .filter(sc => sc && sc.trim() !== '')
                        )).sort()
                      : [];
                    setSubcategoryOptions(newSubcategories);
                    setSelectedSubcategory('');
                    setOpenDropdown(null);
                    handleSearch(document.querySelector<HTMLInputElement>('.search-input')?.value || '', undefined, newCategory, '');
                  }}
                >
                  {category}
                </button>
                
                {openDropdown === category && categorySubcategories.length > 0 && (
                  <div className="subcategory-dropdown">
                    <button
                      className={`subcategory-item ${selectedCategory === category && !selectedSubcategory ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedCategory(category);
                        setSelectedSubcategory('');
                        setSubcategoryOptions(categorySubcategories);
                        setOpenDropdown(null);
                        handleSearch(document.querySelector<HTMLInputElement>('.search-input')?.value || '', undefined, category, '');
                      }}
                    >
                      Todas de {category}
                    </button>
                    {categorySubcategories.map(sub => (
                      <button
                        key={sub}
                        className={`subcategory-item ${selectedCategory === category && selectedSubcategory === sub ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedCategory(category);
                          setSelectedSubcategory(sub);
                          setSubcategoryOptions(categorySubcategories);
                          setOpenDropdown(null);
                          handleSearch(document.querySelector<HTMLInputElement>('.search-input')?.value || '', undefined, category, sub);
                        }}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </div>
      )}
      
      {/* Mobile Menu Overlay */}
      <div className={`mobile-menu-overlay ${isMobileMenuOpen ? 'active' : ''}`}>
        <div className="mobile-menu">
          <button 
            className={`mobile-menu-item ${!selectedCategory ? 'active' : ''}`}
            onClick={() => {
              setSelectedCategory('');
              setSelectedSubcategory('');
              setSubcategoryOptions([]);
              setSelectedBrand('');
              setSelectedAge('');
              setSearchResults([]);
              setHasSearched(false);
              setIsMobileMenuOpen(false);
              const searchInput = document.querySelector<HTMLInputElement>('.search-input');
              if (searchInput) {
                searchInput.value = '';
              }
            }}
          >
            Home
          </button>
          {categoryOptions.map(category => {
            const categorySubcategories = Array.from(new Set(allProducts
              .filter(p => p.category === category)
              .map(p => p.subcategory)
              .filter(sc => sc && sc.trim() !== '')
            )).sort();
            
            const hasSubcategories = categorySubcategories.length > 0;
            const isExpanded = mobileExpandedCategory === category;
            
            return (
              <div key={category} className="mobile-category-container">
                <div className="mobile-category-header">
                  <button 
                    className={`mobile-menu-item category-main ${selectedCategory === category ? 'active' : ''}`}
                    onClick={() => {
                      if (!hasSubcategories) {
                        // Se não tem subcategorias, vai direto
                        const newCategory = category === selectedCategory ? '' : category;
                        setSelectedCategory(newCategory);
                        setSelectedSubcategory('');
                        setSubcategoryOptions([]);
                        setIsMobileMenuOpen(false);
                        handleSearch(document.querySelector<HTMLInputElement>('.search-input')?.value || '', undefined, newCategory, '');
                      } else {
                        // Se tem subcategorias, expande/colapsa
                        setMobileExpandedCategory(isExpanded ? null : category);
                      }
                    }}
                  >
                    <span className="category-text">{category}</span>
                    {hasSubcategories && (
                      <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
                    )}
                  </button>
                </div>
                
                {hasSubcategories && isExpanded && (
                  <div className="mobile-subcategory-list">
                    <button
                      className={`mobile-submenu-item ${selectedCategory === category && !selectedSubcategory ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedCategory(category);
                        setSelectedSubcategory('');
                        setSubcategoryOptions(categorySubcategories);
                        setMobileExpandedCategory(null);
                        setIsMobileMenuOpen(false);
                        handleSearch(document.querySelector<HTMLInputElement>('.search-input')?.value || '', undefined, category, '');
                      }}
                    >
                      Todas de {category}
                    </button>
                    {categorySubcategories.map(sub => (
                      <button
                        key={sub}
                        className={`mobile-submenu-item ${selectedCategory === category && selectedSubcategory === sub ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedCategory(category);
                          setSelectedSubcategory(sub);
                          setSubcategoryOptions(categorySubcategories);
                          setMobileExpandedCategory(null);
                          setIsMobileMenuOpen(false);
                          handleSearch(document.querySelector<HTMLInputElement>('.search-input')?.value || '', undefined, category, sub);
                        }}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #f0f0f0' }}>
            <div style={{ padding: '10px 20px 5px', fontSize: '13px', color: '#999', fontFamily: 'Inter, sans-serif' }}>
              👋 {user?.name || 'Usuária'}
            </div>
            <button
              className="mobile-menu-item"
              onClick={() => { setIsMobileMenuOpen(false); logout(); }}
              style={{ color: '#D98C73', fontWeight: '600' }}
            >
              Sair
            </button>
          </div>
        </div>
        </div>
      <main className="App-main">
        {/* Mostrar conteúdo inicial apenas quando não há busca */}
        {!hasSearched && (
          <>
            <div className="age-group-container">
              <div className="age-group-content">
                <p>Veja os produtos por faixa etária</p>
                <div className="age-buttons-container">
                  {ageOptions.map((age) => (
                    <button 
                      key={age}
                      className={`age-button ${selectedAge === age ? 'active' : ''}`}
                      onClick={() => {
                        const newAge = age === selectedAge ? '' : age;
                        setSelectedAge(newAge);
                        handleSearch(document.querySelector<HTMLInputElement>('.search-input')?.value || '', selectedBrand, selectedCategory, selectedSubcategory, newAge);
                      }}
                    >
                      {age}
                    </button>
                  ))}
                </div>
              </div>
              <div className="age-group-image">
                <img src="https://enxovalinteligente.com.br/wp-content/uploads/2026/02/Elisa_ensaiofamilia_017-1-1-1-1.jpg" alt="Elisa" />
              </div>
            </div>
            
            <div className="categories-section">
          <p className="categories-intro-text">Pule direto para uma das categorias</p>
          <div className="categories-container">
          <div className="categories-scroll">
            {[
              { name: 'Vestuário', image: 'https://enxovalinteligente.com.br/wp-content/uploads/2025/08/roupa_2.jpg' },
              { name: 'Higiene', image: 'https://enxovalinteligente.com.br/wp-content/uploads/2026/01/Sabonete-liquido.jpg' }, 
              { name: 'Viagem', image: 'https://enxovalinteligente.com.br/wp-content/uploads/2025/12/zap_aviao.jpg' },
              { name: 'Passeio', image: 'https://enxovalinteligente.com.br/wp-content/uploads/2026/02/video_protetores-para-janela-carro.jpg' },
              { name: 'Alimentação', image: 'https://enxovalinteligente.com.br/wp-content/uploads/2025/08/batalha-cadeiras.jpg' },
              { name: 'Diversão', image: 'https://enxovalinteligente.com.br/wp-content/uploads/2026/02/ChatGPT-Image-Feb-19-2026-03_40_43-PM.png' },
              { name: 'Quarto', image: 'https://enxovalinteligente.com.br/wp-content/uploads/2025/08/quarto-dos-meninos.jpg' },
              { name: 'Escola', image: 'https://enxovalinteligente.com.br/wp-content/uploads/2025/08/mochila-felipe.jpg' }
            ].map((categoryData, index) => (
              <div 
                key={categoryData.name}
                className={`category-card ${selectedCategory === categoryData.name ? 'active' : ''}`}
                onClick={() => {
                  const newCategory = categoryData.name === selectedCategory ? '' : categoryData.name;
                  setSelectedCategory(newCategory);
                  const newSubcategories = newCategory
                    ? Array.from(new Set(allProducts
                        .filter(p => p.category === newCategory)
                        .map(p => p.subcategory)
                        .filter(sc => sc && sc.trim() !== '')
                      )).sort()
                    : [];
                  setSubcategoryOptions(newSubcategories);
                  setSelectedSubcategory('');
                  handleSearch(document.querySelector<HTMLInputElement>('.search-input')?.value || '', undefined, newCategory, '');
                }}
              >
                {categoryData.image ? (
                  <img src={categoryData.image} alt={categoryData.name} />
                ) : (
                  <div className="category-image-placeholder">
                    <span>📷</span>
                  </div>
                )}
                <span className="category-name">{categoryData.name}</span>
              </div>
            ))}
          </div>
            </div>
            </div>
            
            <div className="brands-section">
            <p className="brands-intro-text">Explore por marca</p>
            <div className="brands-container">
          <div className="brands-scroll">
            {brandOptions.map((brand, index) => (
              <div 
                key={brand}
                className={`brand-card ${selectedBrand === brand ? 'active' : ''}`}
                style={{
                  borderColor: index % 4 === 0 ? '#6b8e6b' : 
                              index % 4 === 1 ? '#4a6b82' : 
                              index % 4 === 2 ? '#c55a20' : '#d66b72',
                  color: index % 4 === 0 ? '#6b8e6b' : 
                         index % 4 === 1 ? '#4a6b82' : 
                         index % 4 === 2 ? '#c55a20' : '#d66b72'
                }}
                onClick={() => {
                  const newBrand = brand === selectedBrand ? '' : brand;
                  setSelectedBrand(newBrand);
                  handleSearch(document.querySelector<HTMLInputElement>('.search-input')?.value || '', newBrand);
                }}
              >
                <span className="brand-name">{brand}</span>
              </div>
            ))}
          </div>
            </div>
            </div>
          </>
        )}
        
        {isLoading ? (
          <div className="loading">
            <p>Carregando produtos...</p>
          </div>
        ) : error ? (
          <div className="error-message">
            <p>{error}</p>
          </div>
        ) : (
          <div className="search-results">
            {hasSearched && searchResults.length === 0 ? (
              <p className="no-results">Nenhum produto encontrado. Tente outra busca.</p>
            ) : (
              searchResults.map(product => (
                <div key={product.id} className="product-card">
                  <div className="product-info">
                    <h3>{product.name}</h3>
                    {product.marca && <p className="product-brand"><strong>Marca:</strong> {product.marca}</p>}
                    {product.imageUrl && product.imageUrl !== 'https://via.placeholder.com/150' && (
                      <div className="product-image">
                        <img src={product.imageUrl} alt={product.name} />
                      </div>
                    )}
                    {/* Age tags */}
                    <div className="product-ages">
                      {[product.idade, product.idade2, product.idade3]
                        .filter(age => age && age.trim() !== '' && age.trim().toLowerCase() !== 'idade')
                        .map((age, index) => (
                          <span key={index} className="age-tag">{age}</span>
                        ))}
                    </div>
                    <p>{product.description}</p>
                    {product.opiniao && <p className="product-opinion"><strong>Opinião:</strong> {product.opiniao}</p>}
                    {product.opiniao_consulta && (
                      <div className="product-consultation-opinion">
                        <p className="opinion-text">{product.opiniao_consulta}</p>
                      </div>
                    )}
                    {product.link ? (
                      <a 
                        href={product.link.startsWith('http') ? product.link : `https://${product.link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="product-link"
                      >
                        Ver na loja
                      </a>
                    ) : (
                      <button 
                        className="product-link disabled"
                        disabled
                      >
                        Link não disponível
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-logo">
            <img src="https://enxovalinteligente.com.br/wp-content/uploads/2026/02/depois_do_enxoval_transparente.png" alt="Logo" className="logo-image" />
          </div>
          <div className="footer-disclaimer">
            <p>O Depois do Enxoval não realiza a venda dos produtos indicados neste site. As recomendações são apenas sugestões de compra, e ao clicar nos links, você será direcionado para lojas responsáveis pela venda, entrega e garantia dos produtos. O Depois do Enxoval pode receber uma comissão pelas compras realizadas por meio desses links, sem nenhum custo extra para você.</p>
          </div>
          <div className="footer-copyright">
            <p>Copyright © 2025 Inc. Todos os direitos reservados. Edufe Digital CNPJ: 48.796.931/0001-74</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return <AppContent />;
};

export default App;
