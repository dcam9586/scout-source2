/**
 * CompareBar Component
 * Fixed bar at the bottom showing products added for comparison
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store/appStore';
import '../styles/components.css';

const CompareBar: React.FC = () => {
  const navigate = useNavigate();
  const compareItems = useAppStore((state) => state.compareItems);
  const removeFromCompare = useAppStore((state) => state.removeFromCompare);
  const clearCompare = useAppStore((state) => state.clearCompare);

  if (compareItems.length === 0) return null;

  const handleCompare = () => {
    navigate('/comparisons');
  };

  return (
    <div className="compare-bar" role="region" aria-label="Product comparison bar">
      <div className="compare-bar__content">
        <div className="compare-bar__items">
          <span className="compare-bar__label">
            Compare ({compareItems.length}/4):
          </span>
          {compareItems.map((item) => (
            <div key={item.id} className="compare-bar__item">
              <img
                src={item.image || 'https://via.placeholder.com/40x40?text=?'}
                alt={item.title}
                className="compare-bar__item-image"
              />
              <span className="compare-bar__item-title" title={item.title}>
                {item.title.length > 20 ? item.title.slice(0, 20) + '...' : item.title}
              </span>
              <button
                className="compare-bar__item-remove"
                onClick={() => removeFromCompare(item.id)}
                aria-label={`Remove ${item.title} from comparison`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="compare-bar__actions">
          <button
            className="compare-bar__btn compare-bar__btn--clear"
            onClick={clearCompare}
          >
            Clear All
          </button>
          <button
            className="compare-bar__btn compare-bar__btn--compare"
            onClick={handleCompare}
            disabled={compareItems.length < 2}
          >
            Compare Now →
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompareBar;
