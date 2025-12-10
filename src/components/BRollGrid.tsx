import React from 'react';
import { BRollAsset } from '../types';
import { BRollCard } from './BRollCard';

interface BRollGridProps {
  assets: BRollAsset[];
  onApprove: (assetId: string) => void;
  onReject: (assetId: string) => void;
  onRegenerate: (assetId: string) => void;
}

export const BRollGrid: React.FC<BRollGridProps> = ({
  assets,
  onApprove,
  onReject,
  onRegenerate
}) => {
  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#f1f5f9',
          margin: 0
        }}>
          All B-Roll Assets ({assets.length})
        </h2>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '20px'
      }}>
        {assets.map(asset => (
          <BRollCard
            key={asset.id}
            asset={asset}
            onApprove={onApprove}
            onReject={onReject}
            onRegenerate={onRegenerate}
          />
        ))}
      </div>
    </div>
  );
};
