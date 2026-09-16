import { React, useState, useEffect } from "react";
import "./content.css";
import products from "../../products";

const ITEMS_PER_PAGE = 4; //limit

const Content = () => {
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE; //offset     (page-1)*limit
  const currentProducts = products.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  return (
    <div className="content">
      {currentProducts.map((product) => (
        <div key={product.id} className="product-card">
          <img src={product.image} alt={product.name} />
          <h3>{product.name}</h3>
          <span>{product.price.toLocaleString()} تومان</span>
        </div>
      ))}

      <div className="pagination">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          before
        </button>
        <span>
          page {currentPage} from {totalPages}
        </span>
        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          next
        </button>
      </div>
    </div>
  );
};

export default Content;
