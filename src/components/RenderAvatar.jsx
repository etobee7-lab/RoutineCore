import React from 'react';

const RenderAvatar = ({ avatar, className = '' }) => {
  if (avatar && (avatar.startsWith('/') || avatar.startsWith('http'))) {
    return <img src={avatar} alt="avatar" className={className} />;
  }
  return <span className={className}>{avatar}</span>;
};

export default RenderAvatar;
