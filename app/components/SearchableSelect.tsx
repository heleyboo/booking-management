"use client"

import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { useState, useMemo } from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export interface Option {
    id: string
    label: string
    subLabel?: string
}

interface SearchableSelectProps {
    options: Option[]
    value?: string | string[]
    onChange: (value: any) => void
    placeholder?: string
    className?: string
    disabled?: boolean
    multiple?: boolean
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Select...",
    className,
    disabled = false,
    multiple = false
}: SearchableSelectProps) {
    const [query, setQuery] = useState('')

    const selectedOptions = useMemo(() => {
        if (multiple && Array.isArray(value)) {
            return options.filter(opt => value.includes(opt.id))
        }
        return options.find(opt => opt.id === value)
    }, [options, value, multiple])

    const filteredOptions = query === ''
        ? options
        : options.filter((option) => {
            return (
                option.label.toLowerCase().includes(query.toLowerCase()) ||
                (option.subLabel && option.subLabel.toLowerCase().includes(query.toLowerCase()))
            )
        })

    return (
        <div className={className}>
            <Combobox
                value={selectedOptions || (multiple ? [] : null)}
                onChange={(val: any) => {
                    if (multiple) {
                        onChange(val.map((v: Option) => v.id))
                    } else {
                        if (val) onChange(val.id)
                    }
                }}
                onClose={() => setQuery('')}
                disabled={disabled}
                multiple={multiple}
            >
                <div className="relative">
                    <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-300 shadow-sm focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 sm:text-sm">
                        <ComboboxInput
                            className={clsx(
                                "w-full border-none py-2.5 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0",
                                disabled && "bg-gray-100 text-gray-500 cursor-not-allowed"
                            )}
                            displayValue={(val: any) => {
                                if (multiple && Array.isArray(val)) {
                                    return val.map(v => v.label).join(', ')
                                }
                                return (val as Option)?.label || ''
                            }}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={placeholder}
                        />
                        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronsUpDown
                                className="h-4 w-4 text-gray-400"
                                aria-hidden="true"
                            />
                        </ComboboxButton>
                    </div>

                    <ComboboxOptions
                        anchor="bottom start"
                        className="absolute z-50 mt-1 max-h-60 w-[var(--input-width)] overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm empty:invisible"
                    >
                        {filteredOptions.length === 0 && query !== '' ? (
                            <div className="relative cursor-default select-none px-4 py-2 text-gray-700">
                                Nothing found.
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <ComboboxOption
                                    key={option.id}
                                    value={option}
                                    className={({ focus }) =>
                                        `relative cursor-default select-none py-2 pl-3 pr-9 ${focus ? 'bg-indigo-600 text-white' : 'text-gray-900'
                                        }`
                                    }
                                >
                                    {({ selected, focus }) => (
                                        <>
                                            <div className="flex flex-col">
                                                <span className={`block truncate ${selected ? 'font-semibold' : 'font-normal'}`}>
                                                    {option.label}
                                                </span>
                                                {option.subLabel && (
                                                    <span className={`block truncate text-xs ${focus ? 'text-indigo-200' : 'text-gray-500'}`}>
                                                        {option.subLabel}
                                                    </span>
                                                )}
                                            </div>

                                            {selected && (
                                                <span
                                                    className={`absolute inset-y-0 right-0 flex items-center pr-4 ${focus ? 'text-white' : 'text-indigo-600'
                                                        }`}
                                                >
                                                    <Check className="h-4 w-4" aria-hidden="true" />
                                                </span>
                                            )}
                                        </>
                                    )}
                                </ComboboxOption>
                            ))
                        )}
                    </ComboboxOptions>
                </div>
            </Combobox>
        </div>
    )
}
