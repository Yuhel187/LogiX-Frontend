"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getProductApi, listProductsApi } from "../../api/products.api";
import type { Product } from "../../schemas/product.schema";

export interface ProductPickerProps {
  value?: string;
  onChange: (productId: string, product?: Product) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;
  allLabel?: string;
}

export function ProductPicker({
  value,
  onChange,
  placeholder = "Chọn sản phẩm...",
  disabled = false,
  className,
  allowClear = false,
  allLabel,
}: ProductPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [fetchedProduct, setFetchedProduct] = React.useState<Product | null>(null);

  // Derive selected product without synchronous setState in effect
  const selectedProduct =
    products.find((p) => p.id === value) ||
    (fetchedProduct?.id === value ? fetchedProduct : null);

  // Fetch single product asynchronously when value provided and not found yet
  React.useEffect(() => {
    if (!value) return;
    let active = true;

    getProductApi(value)
      .then((data) => {
        if (active) setFetchedProduct(data);
      })
      .catch(() => {
        // Silently ignore
      });

    return () => {
      active = false;
    };
  }, [value]);

  // Fetch products on search query or popover open
  React.useEffect(() => {
    if (!open) return;

    let active = true;

    const timer = setTimeout(() => {
      setLoading(true);
      listProductsApi({
        q: query.trim() || undefined,
        status: "ACTIVE",
        pageSize: 20,
      })
        .then((res) => {
          if (active) {
            setProducts(res.items);
            setLoading(false);
          }
        })
        .catch(() => {
          if (active) {
            setProducts([]);
            setLoading(false);
          }
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, query]);

  const handleSelect = (product: Product) => {
    setFetchedProduct(product);
    onChange(product.id, product);
    setOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFetchedProduct(null);
    onChange("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal h-8 text-xs",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">
            {selectedProduct ? (
              <span className="inline-flex items-center gap-1.5 truncate">
                <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-foreground font-semibold">
                  {selectedProduct.sku}
                </span>
                <span className="truncate text-foreground font-medium">
                  {selectedProduct.name}
                </span>
                {selectedProduct.baseUnit && (
                  <span className="text-[10px] text-muted-foreground">
                    ({selectedProduct.baseUnit})
                  </span>
                )}
              </span>
            ) : allLabel && !value ? (
              allLabel
            ) : (
              placeholder
            )}
          </span>
          <div className="flex items-center gap-1 ml-1 shrink-0">
            {allowClear && value && (
              <span
                role="button"
                tabIndex={0}
                className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleClear();
                }}
              >
                <X className="size-3" />
              </span>
            )}
            <ChevronsUpDown className="size-3.5 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Tìm theo SKU hoặc tên sản phẩm..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-60 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-2">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Đang tải...</span>
              </div>
            )}
            {!loading && products.length === 0 && (
              <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                Không tìm thấy sản phẩm phù hợp.
              </CommandEmpty>
            )}
            {!loading && (
              <CommandGroup>
                {allLabel && (
                  <CommandItem
                    value="all"
                    onSelect={() => handleClear()}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 size-3.5",
                        !value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="font-medium text-xs">{allLabel}</span>
                  </CommandItem>
                )}
                {products.map((product) => {
                  const isSelected = value === product.id;
                  return (
                    <CommandItem
                      key={product.id}
                      value={product.id}
                      onSelect={() => handleSelect(product)}
                      className="cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Check
                          className={cn(
                            "size-3.5 shrink-0",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] bg-muted px-1 rounded text-muted-foreground font-medium">
                              {product.sku}
                            </span>
                            <span className="font-medium text-xs truncate">
                              {product.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate">
                            ĐVT: {product.baseUnit} | TL: {product.weight} kg | TT: {product.volume} m³
                          </span>
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
