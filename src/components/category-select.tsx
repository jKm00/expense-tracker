"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { Category } from "@/db/schema";

interface CategorySelectProps {
  categories: Category[];
  value: string;
  onChange: (value: string, isNew: boolean) => void;
  placeholder?: string;
}

export function CategorySelect({
  categories,
  value,
  onChange,
  placeholder = "Category",
}: CategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase()),
  );

  const exactMatch = categories.find(
    (cat) => cat.name.toLowerCase() === search.toLowerCase(),
  );

  const showCreateOption = search.trim() && !exactMatch;

  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        if (!value) setSearch("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const handleSelect = useCallback(
    (categoryName: string, isNew: boolean) => {
      setSearch(categoryName);
      onChange(categoryName, isNew);
      setIsOpen(false);
      inputRef.current?.blur();
    },
    [onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && search.trim()) {
      e.preventDefault();
      if (exactMatch) {
        handleSelect(exactMatch.name, false);
      } else {
        handleSelect(search.trim(), true);
      }
    }
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          onChange("", false);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex h-12 w-full rounded-xl border-2 border-gray-200 bg-white px-4 text-base transition-colors placeholder:text-gray-400 focus:border-gray-900 focus:outline-none"
      />

      {isOpen && (filteredCategories.length > 0 || showCreateOption) && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-gray-200 bg-white py-1 shadow-lg max-h-[250px] overflow-auto">
          {filteredCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => handleSelect(category.name, false)}
              className={cn(
                "w-full px-4 py-3 text-left text-base transition-colors hover:bg-gray-100",
                category.name.toLowerCase() === search.toLowerCase() &&
                  "bg-gray-50",
              )}
            >
              {category.name}
            </button>
          ))}

          {showCreateOption && (
            <>
              {filteredCategories.length > 0 && (
                <div className="my-1 border-t border-gray-100" />
              )}
              <button
                type="button"
                onClick={() => handleSelect(search.trim(), true)}
                className="w-full px-4 py-3 text-left text-base text-emerald-600 transition-colors hover:bg-emerald-50"
              >
                Create &quot;{search.trim()}&quot;
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
