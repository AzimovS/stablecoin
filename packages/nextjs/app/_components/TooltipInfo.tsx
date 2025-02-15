import React from "react";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";

interface TooltipInfoProps {
  top: number;
  right: number;
  infoText: string;
}

// Note: The indicator should be added to the outer component where this component is used.
const TooltipInfo: React.FC<TooltipInfoProps> = ({ top, right, infoText }) => {
  return (
    <span className={`top-${top} right-${right} indicator-item`}>
      <div className="tooltip tooltip-info tooltip-left" data-tip={infoText}>
        <QuestionMarkCircleIcon className="h-4 w-4" />
      </div>
    </span>
  );
};

export default TooltipInfo;
