import React, { useState, useEffect } from 'react';
import './App.css';
import SearchBar from './components/SearchBar';
import ProductService, { Product } from './services/ProductService';

const App: React.FC = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [subcategoryOptions, setSubcategoryOptions] = useState<string[]>([]);
  const [ageOptions, setAgeOptions] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [selectedAge, setSelectedAge] = useState<string>('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileExpandedCategory, setMobileExpandedCategory] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

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

  const handleSearch = (query: string, brandFilter?: string, categoryFilter?: string, subcategoryFilter?: string, ageFilter?: string) => {
    const currentBrand = brandFilter !== undefined ? brandFilter : selectedBrand;
    const currentCategory = categoryFilter !== undefined ? categoryFilter : selectedCategory;
    const currentSubcategory = subcategoryFilter !== undefined ? subcategoryFilter : selectedSubcategory;
    const currentAge = ageFilter !== undefined ? ageFilter : selectedAge;
    
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
  };



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
          <h1 className="header-title" style={{
            color: '#527a94',
            fontSize: '28px',
            fontWeight: 'bold',
            fontStyle: 'italic',
            margin: '0',
            marginLeft: '15px',
            fontFamily: 'serif'
          }}>Depois do Enxoval</h1>
        </div>
        <div className="header-search">
          <SearchBar onSearch={handleSearch} />
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
            <img src="/images/logo.png" alt="Logo" className="logo-image" />
          </div>
          <div className="footer-disclaimer">
            <p>O Enxoval Inteligente não realiza a venda dos produtos indicados neste site. As recomendações são apenas sugestões de compra, e ao clicar nos links, você será direcionado para lojas responsáveis pela venda, entrega e garantia dos produtos. O Enxoval Inteligente pode receber uma comissão pelas compras realizadas por meio desses links, sem nenhum custo extra para você.</p>
          </div>
          <div className="footer-copyright">
            <p>Copyright © 2025 Inc. Todos os direitos reservados. Edufe Digital CNPJ: 48.796.931/0001-74</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
